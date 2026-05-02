// -------- Global state --------
let foodLog = [];
let foodDB = [];          
let searchIndex = [];     



window.addEventListener("DOMContentLoaded", async () => {
    await loadLocalDatabase();
    const saved = localStorage.getItem("foodLog");
    if (saved) {
        foodLog = JSON.parse(saved);
        renderList();
        updateTotals();
    }
});


async function loadLocalDatabase() {
    try {
        const response = await fetch("Foundation_Foods.json");
        const data = await response.json();
        
        // 1. Match the "FoundationFoods" key
        foodDB = data.FoundationFoods;

        // 2. Add a filter to ensure 'food' and 'food.description' exist before mapping
        searchIndex = foodDB
            .filter(food => food && food.description) 
            .map(food => ({
                name: food.description,
                fdcId: food.fdcId
            }));

        console.log("Database Loaded successfully:", searchIndex.length, "items");
    } catch (err) {
        console.error("Failed to load JSON:", err);
    }
}

// Autocomplete Logic
const foodInput = document.getElementById("foodInput");
const suggestionsBox = document.getElementById("suggestions");

foodInput.addEventListener("input", (e) => {
    const query = e.target.value.trim().toLowerCase();
    if (query.length < 2) {
        hideSuggestions();
        return;
    }
    const matches = searchIndex
        .filter(item => item.name.toLowerCase().includes(query))
        .slice(0, 10);
    showSuggestions(matches);
});

function showSuggestions(list) {
    suggestionsBox.innerHTML = "";
    if (!list.length) {
        hideSuggestions();
        return;
    }
    list.forEach(item => {
        const div = document.createElement("div");
        div.className = "suggestion-item";
        div.textContent = item.name;
        div.onclick = () => {
            foodInput.value = item.name;
            foodInput.dataset.fdcId = item.fdcId;
            hideSuggestions();
        };
        suggestionsBox.appendChild(div);
    });
    suggestionsBox.style.display = "block";
}

function hideSuggestions() {
    suggestionsBox.style.display = "none";
}

// Hide dropdown if clicking outside
document.addEventListener("click", (e) => {
    if (!suggestionsBox.contains(e.target) && e.target !== foodInput) {
        hideSuggestions();
    }
});

// Nutrient extraction logic corrected for your JSON version
function getNutrientsFromLocalDB(fdcId) {
    const food = foodDB.find(f => f.fdcId == fdcId);
    if (!food) return null;

    let cal = 0, protein = 0, carbs = 0, fat = 0;

    food.foodNutrients.forEach(nut => {
        const id = nut.nutrient.id; 
        //const amount = nut.amount ?? 0;

        // new added
        const nutrientName = nut.nutrient.name.toLowerCase();
        const unit = nut.nutrient.unitName.toLowerCase();
        const amount = nut.amount ?? 0;

        // 1. Energy check (looks for "energy" and ensures unit is kcal)
        if (nutrientName.includes("energy") && unit === "kcal") {
            cal = amount;
        } 
        // 2. Protein check
        else if (nutrientName === "protein") {
            protein = amount;
        } 
        // 3. Carbohydrate check (matches "by difference", "by summation", etc)
        else if (nutrientName.includes("carbohydrate")) {
            carbs = amount;
        } 
        // 4. Fat check (matches "total lipid", "total fat", "fatty acids total")
        // We use a rank check or specific keywords to avoid grabbing "saturated fat" by mistake
        else if (nutrientName === "total lipid (fat)" || nutrientName === "total fat (nlea)") {
            fat = amount;
        }
/*
        switch (id) {
            case 1008: // Energy (kcal)
            case 2047:
            case 2048:
                cal = amount;
                break;
            case 1003: // Protein
            case 203:
                protein = amount;
                break;
            case 1005: // Carbohydrate
            case 205:
                carbs = amount;
                break;
            case 1004: // Total Fat
            case 204:
            case 1085:
                fat = amount;
                break;
        }
*/
    });

    // For Oils (like your Soybean Oil), Calories are often not listed in the JSON.
    // If calories are 0 but we found macros, we calculate the calories manually.
    if (cal === 0) {
        cal = (fat * 9) + (protein * 4) + (carbs * 4);
    }

    return {
        name: food.description,
        calPer100: cal,
        proteinPer100: protein,
        carbsPer100: carbs,
        fatPer100: fat,
    };
}

async function addFood() {
    const name = foodInput.value.trim();
    const qtyInput = document.getElementById("qtyInput");
    const qty = parseFloat(qtyInput.value);
    const fdcId = foodInput.dataset.fdcId;

    if (!name || isNaN(qty) || qty <= 0 || !fdcId) {
        alert("Please select a food from the list and enter a valid quantity.");
        return;
    }

    const nutrition = getNutrientsFromLocalDB(fdcId);
    if (nutrition) {
        const factor = qty / 100;
        const entry = {
            name: nutrition.name,
            qty,
            calPer100: nutrition.calPer100,
            proteinPer100: nutrition.proteinPer100,
            carbsPer100: nutrition.carbsPer100,
            fatPer100: nutrition.fatPer100,

            // Store the calculated values based on the weight entered
            cal: nutrition.calPer100 * factor,
            protein: nutrition.proteinPer100 * factor,
            carbs: nutrition.carbsPer100 * factor,
            fat: nutrition.fatPer100 * factor,
        };

        foodLog.push(entry);
        localStorage.setItem("foodLog", JSON.stringify(foodLog));
        renderList();
        updateTotals();
        
        foodInput.value = "";
        foodInput.dataset.fdcId = "";
        qtyInput.value = "";
    }
}

function renderList() {
    const list = document.getElementById("foodList");
    list.innerHTML = "";
    foodLog.forEach((item, index) => {
        const li = document.createElement("li");
        li.className = "food-item";
        li.innerHTML = `
            <div>
                <strong>${item.name}</strong> (${item.qty}g)<br>
                <small>${item.cal.toFixed(1)} kcal | Protein: ${item.protein.toFixed(1)}g | Carbs: ${item.carbs.toFixed(1)}g | Fat: ${item.fat.toFixed(1)}g</small>
            </div>
            <button onclick="deleteEntry(${index})" class="delete-btn">✕</button>
        `;
        list.appendChild(li);
    });
}

function deleteEntry(index) {
    foodLog.splice(index, 1);
    localStorage.setItem("foodLog", JSON.stringify(foodLog));
    renderList();
    updateTotals();
}

function updateTotals() {
    let tCal = 0, tProt = 0, tCarb = 0, tFat = 0;
    foodLog.forEach(i => {
        tCal += i.cal; tProt += i.protein; tCarb += i.carbs; tFat += i.fat; 
        
    });

    document.getElementById("totals").innerHTML = `
        <p style="font-size: 1.2em; color: #ff7a00;">Calories: <strong>${tCal.toFixed(1)} kcal</strong></p>
        <p>Protein: <strong>${tProt.toFixed(1)}g</strong> | Carbs: <strong>${tCarb.toFixed(1)}g</strong> | Fat: <strong>${tFat.toFixed(1)}g</strong></strong></p>
    `;
}

function clearLog() {
    if (confirm("Are you sure you want to clear your entire food log for today?")) {
        foodLog = []; // Empty the array
        localStorage.removeItem("foodLog"); // Clear it from the browser memory
        renderList(); // Refresh the UI
        updateTotals(); // Reset the numbers
    }
}

function addManualFood() {
    const nameInput = document.getElementById("manualName");
    const calInput = document.getElementById("manualCal");
    const pInput = document.getElementById("manualProtein");
    const cInput = document.getElementById("manualCarbs");
    const fInput = document.getElementById("manualFat");

    const name = nameInput.value.trim();
    const manualCal = parseFloat(calInput.value);
    const p = parseFloat(pInput.value) || 0;
    const c = parseFloat(cInput.value) || 0;
    const f = parseFloat(fInput.value) || 0;

    if (!name) {
        alert("Please enter a food name.");
        return;
    }

    // Logic: Use manual calorie input if provided, otherwise calculate it
    let finalCalories = 0;
    if (!isNaN(manualCal)) {
        finalCalories = manualCal;
    } else {
        finalCalories = (p * 4) + (c * 4) + (f * 9);
    }

    const entry = {
        name: name + " (Manual)",
        qty: "—", 
        protein: p,
        carbs: c,
        fat: f,
        cal: finalCalories
    };

    foodLog.push(entry);
    localStorage.setItem("foodLog", JSON.stringify(foodLog));

    renderList();
    updateTotals();

    // Clear all fields
    [nameInput, calInput, pInput, cInput, fInput].forEach(input => input.value = "");
}