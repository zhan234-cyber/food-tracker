// -------- Global state --------
const i18n = {
    en: {
        title: "Food Tracker",
        autoSearch: "Auto Search",
        searchPlaceholder: "Search food (e.g. Chicken)",
        weightPlaceholder: "Weight in grams (e.g. 100)",
        addBtn: "Add to Log",
        manualTitle: "Manual Entry",
        manualName: "Food Name (e.g. Homemade Pizza)",
        manualCal: "Total Calories (kcal)",
        prot: "Prot (g)",
        carb: "Carb (g)",
        fat: "Fat (g)",
        manualAddBtn: "Add Manual Entry",
        todayTitle: "Today's Foods",
        clearBtn: "Clear Daily Log",
        totalsTitle: "Daily Totals",
        caloriesLabel: "Calories",
        langBtn: "中文"
    },
    zh: {
        title: "饮食追踪器",
        autoSearch: "自动搜索",
        searchPlaceholder: "搜索食物 (如：鸡肉)",
        weightPlaceholder: "重量（克）",
        addBtn: "加入记录",
        manualTitle: "手动输入",
        manualName: "食物名称 (如：自制比萨)",
        manualCal: "总热量 (大卡)",
        prot: "蛋白质 (g)",
        carb: "碳水 (g)",
        fat: "脂肪 (g)",
        manualAddBtn: "增加手动记录",
        todayTitle: "今日饮食",
        clearBtn: "清空今日记录",
        totalsTitle: "今日总量",
        caloriesLabel: "热量",
        langBtn: "English"
    }
};

let currentLang = 'en';

const searchMapping = {
    "鸡肉": "chicken",
    "牛肉": "beef",
    "猪肉": "pork",
    "鱼肉": "fish",
    "三文鱼": "salmon",
    "鸡蛋": "eggs",
    "苹果": "apples",
    "香蕉": "bananas",
    "橘子": "mandarin",
    "米饭": "rice",
    "面包": "bread",
    "牛奶": "milk",
    "烤制的": "broilers",
    "烤制的": "broiler",
    "油": "oil",
    "油": "oil",
    "开心果": "pistachio nuts",
    "腰果": "cashew nuts",
    "杏仁": "almonds",
    "夏威夷果": "macadamia nuts"
};
let debounceTimer; // Also add this for search speed

let foodLog = [];
let foodDB = [];          
let searchIndex = [];     



window.addEventListener("DOMContentLoaded", async () => {
    // 1. Check for saved language preference
    const savedLang = localStorage.getItem("preferredLang");
    if (savedLang) currentLang = savedLang;

    await loadLocalDatabase();

    setupSearch(); // <--- ADD THIS LINE
    // 2. IMPORTANT: Apply the language labels to the UI on startup
    applyLanguage();

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

/*
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
*/

function setupSearch() {
    const foodInput = document.getElementById("foodInput");
    
    foodInput.addEventListener("input", (e) => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            let query = e.target.value.trim().toLowerCase();
            
            // Translate Chinese search terms to English before searching
            if (currentLang === 'zh') {
                for (const [zh, en] of Object.entries(searchMapping)) {
                    if (query.includes(zh)) {
                        query = query.replace(zh, en);
                    }
                }
            }

            if (query.length < 2) {
                hideSuggestions();
                return;
            }

            const matches = searchIndex
                .filter(item => item.name.toLowerCase().includes(query))
                .slice(0, 10);
                
            showSuggestions(matches);
        }, 150); 
    });
}

function showSuggestions(list) {
    suggestionsBox.innerHTML = "";
    if (!list.length) {
        hideSuggestions();
        return;
    }

    const lang = i18n[currentLang];

    list.forEach(item => {
        const div = document.createElement("div");
        div.className = "suggestion-item";

        let originalName = item.name;
        let translatedName = item.name;

        // If Chinese mode is on, try to replace keywords
        if (currentLang === 'zh') {
            Object.entries(searchMapping).forEach(([zh, en]) => {
                const regex = new RegExp(en, "gi");
                translatedName = translatedName.replace(regex, zh);
            });
        }

        // Display translated name, but keep original for selection logic
        div.innerHTML = `
            <div class="name-main">${translatedName}</div>
            <div class="name-sub">${currentLang === 'zh' ? originalName : ''}</div>
        `;

        //div.textContent = item.name;
        div.onclick = () => {
            //foodInput.value = originalName; // Always keep original English for data lookup
            foodInput.value = (currentLang === 'zh') ? translatedName : originalName;
            //foodInput.value = item.name;
            foodInput.dataset.fdcId = item.fdcId;
            // NEW: Store the translated name so addFood can use it
            foodInput.dataset.translatedName = translatedName;
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

        // NEW: Get the translated name we stored during the click
        const savedTranslation = foodInput.dataset.translatedName;

        const entry = {
            // ALWAYS store the original English name for reference
            enName: nutrition.name,
            // FIX: Use the translation if we are in Chinese mode
            name: (currentLang === 'zh' && savedTranslation) ? savedTranslation : nutrition.name,
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

        // NEW: Clear the translation data along with other fields
        foodInput.value = "";
        foodInput.dataset.fdcId = "";
        foodInput.dataset.translatedName = ""; 
        qtyInput.value = "";

        renderList();
        updateTotals();
        /*
        foodInput.value = "";
        foodInput.dataset.fdcId = "";
        qtyInput.value = "";
        */
    }
}

function renderList() {
    const list = document.getElementById("foodList");
    list.innerHTML = "";

    // ADD THIS LINE: Get current language terms
    const lang = i18n[currentLang];

    foodLog.forEach((item, index) => {
        const li = document.createElement("li");
        li.className = "food-item";


        // --- DYNAMIC TRANSLATION LOGIC ---
        // Default to the stored name (good for manual entries)
        let displayName = item.name;

        // If it's an auto-searched item (has enName), translate it on the fly
        if (item.enName) {
            displayName = item.enName;
            if (currentLang === 'zh') {
                Object.entries(searchMapping).forEach(([zh, en]) => {
                    const regex = new RegExp(en, "gi");
                    displayName = displayName.replace(regex, zh);
                });
            }
        }
        // ---------------------------------


        // Fix: handle the dash for manual entries
        const qtyDisplay = item.qty === "—" ? "" : `(${item.qty}g)`;

        li.innerHTML = `
            <div>
                <strong>${displayName}</strong> ${qtyDisplay}<br>
                <small>${item.cal.toFixed(1)} kcal | ${lang.prot}: ${item.protein.toFixed(1)}g | ${lang.carb}: ${item.carbs.toFixed(1)}g | ${lang.fat}: ${item.fat.toFixed(1)}g</small>
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

    // ADD THIS LINE:
    const lang = i18n[currentLang];

    document.getElementById("totals").innerHTML = `
        <p style="font-size: 1.2em; color: #ff7a00;">${lang.caloriesLabel}: <strong>${tCal.toFixed(1)} kcal</strong></p>
        <p>${lang.prot}: <strong>${tProt.toFixed(1)}g</strong> | ${lang.carb}: <strong>${tCarb.toFixed(1)}g</strong> | ${lang.fat}: <strong>${tFat.toFixed(1)}g</strong></p>
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
        //name: name + " (Manual)",
        name: name + (currentLang === 'zh' ? " (手动)" : " (Manual)"),
        enName: null, // Manual entries don't re-translate automatically
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


function toggleLanguage() {
    currentLang = currentLang === 'en' ? 'zh' : 'en';
    // Save preference so it stays after refresh
    localStorage.setItem("preferredLang", currentLang); 
    applyLanguage();
}

function applyLanguage() {
    const lang = i18n[currentLang];

    // --- NEW TOGGLE ANIMATION LOGIC ---
    const handle = document.getElementById("switchHandle");
    const labels = document.querySelectorAll(".lang-label");

    if (handle && labels.length >= 2) {
        if (currentLang === 'zh') {
            handle.classList.add("translate-zh");
            labels[1].classList.add("active-lang"); // ZH turns orange
            labels[0].classList.remove("active-lang");
        } else {
            handle.classList.remove("translate-zh");
            labels[0].classList.add("active-lang"); // EN turns orange
            labels[1].classList.remove("active-lang");
        }
    }
    // ----------------------------------

    // Add this specific line:
    document.getElementById("autoSearchTitle").textContent = lang.autoSearch;

    // Update Headers and Buttons
    //document.querySelector("h1").textContent = lang.title;

    // Update Headers and Buttons
    document.getElementById("mainTitle").textContent = lang.title;
    document.getElementById("autoSearchTitle").textContent = lang.autoSearch;

    document.getElementById("foodInput").placeholder = lang.searchPlaceholder;
    document.getElementById("qtyInput").placeholder = lang.weightPlaceholder;
    document.getElementById("addButton").textContent = lang.addBtn;
    
    // Update Manual Section - Note: use IDs to be safe
    document.querySelector(".manual-card h3").textContent = lang.manualTitle;
    document.getElementById("manualName").placeholder = lang.manualName;
    document.getElementById("manualCal").placeholder = lang.manualCal;
    document.getElementById("manualProtein").placeholder = lang.prot;
    document.getElementById("manualCarbs").placeholder = lang.carb;
    document.getElementById("manualFat").placeholder = lang.fat;
    document.querySelector(".manual-add-btn").textContent = lang.manualAddBtn;

    // Update List and Totals labels (using nth-of-type based on your HTML structure)
    const cards = document.querySelectorAll(".card h3");
    if(cards[1]) cards[1].textContent = lang.todayTitle; 
    if(cards[2]) cards[2].textContent = lang.totalsTitle;
    
    document.querySelector(".clear-btn").textContent = lang.clearBtn;
    document.getElementById("langSwitch").textContent = lang.langBtn;

    renderList();
    updateTotals();
}