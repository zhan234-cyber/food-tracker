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
        
        // Match the "FoundationFoods" key in your JSON
        foodDB = data.FoundationFoods;

        searchIndex = foodDB.map(food => ({
            name: food.description,
            fdcId: food.fdcId
        }));
        console.log("Database Loaded:", foodDB.length, "items");
    } catch (err) {
        console.error("Failed to load JSON. Ensure you are using a local server:", err);
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
        const amount = nut.amount ?? 0;

        switch (id) {
            case 1008: // Energy (kcal)
                cal = amount;
                break;
            case 1003: // Protein
                protein = amount;
                break;
            case 1005: // Carbohydrate
                carbs = amount;
                break;
            case 1004: // Total Fat
                fat = amount;
                break;
        }
    });

    return {
        name: food.description,
        calPer100: cal,
        proteinPer100: protein,
        carbsPer100: carbs,
        fatPer100: fat
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
            cal: nutrition.calPer100 * factor,
            protein: nutrition.proteinPer100 * factor,
            carbs: nutrition.carbsPer100 * factor,
            fat: nutrition.fatPer100 * factor
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
                <small>${item.cal.toFixed(1)} kcal | P: ${item.protein.toFixed(1)}g | C: ${item.carbs.toFixed(1)}g | F: ${item.fat.toFixed(1)}g</small>
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
        <p style="font-size: 1.2em; color: #ff7a00;"><strong>${tCal.toFixed(1)} kcal</strong></p>
        <p>P: <strong>${tProt.toFixed(1)}g</strong> | C: <strong>${tCarb.toFixed(1)}g</strong> | F: <strong>${tFat.toFixed(1)}g</strong></p>
    `;
}