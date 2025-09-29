// // Real-world bulk density database for various materials
// // Data sourced from engineering handbooks and industry standards

// const bulkDensityDatabase = {
//   // Agricultural Products
//   agricultural: [
//     { name: "Wheat", density: 780, coneAngle: 28, repose: 25, category: "Grain" },
//     { name: "Corn (Maize)", density: 720, coneAngle: 25, repose: 23, category: "Grain" },
//     { name: "Rice", density: 750, coneAngle: 30, repose: 27, category: "Grain" },
//     { name: "Barley", density: 650, coneAngle: 26, repose: 24, category: "Grain" },
//     { name: "Oats", density: 430, coneAngle: 32, repose: 28, category: "Grain" },
//     { name: "Soybeans", density: 750, coneAngle: 27, repose: 25, category: "Grain" },
//     { name: "Sunflower Seeds", density: 450, coneAngle: 35, repose: 30, category: "Seeds" },
//     { name: "Rapeseed", density: 680, coneAngle: 30, repose: 27, category: "Seeds" },
//     { name: "Sugar (Granulated)", density: 850, coneAngle: 35, repose: 32, category: "Sugar" },
//     { name: "Sugar (Raw)", density: 960, coneAngle: 40, repose: 35, category: "Sugar" },
//     { name: "Flour (Wheat)", density: 600, coneAngle: 45, repose: 40, category: "Flour" },
//     { name: "Rice Flour", density: 580, coneAngle: 42, repose: 38, category: "Flour" },
//   ],

//   // Chemical & Pharmaceutical
//   chemical: [
//     { name: "Salt (Table Salt)", density: 1200, coneAngle: 35, repose: 32, category: "Salt" },
//     { name: "Salt (Rock Salt)", density: 1300, coneAngle: 30, repose: 28, category: "Salt" },
//     { name: "Sodium Chloride", density: 1200, coneAngle: 35, repose: 32, category: "Chemical" },
//     { name: "Calcium Carbonate", density: 1500, coneAngle: 40, repose: 35, category: "Chemical" },
//     { name: "Limestone (Crushed)", density: 1600, coneAngle: 35, repose: 32, category: "Chemical" },
//     { name: "Activated Carbon", density: 400, coneAngle: 50, repose: 45, category: "Chemical" },
//     { name: "Alumina", density: 1500, coneAngle: 38, repose: 34, category: "Chemical" },
//     { name: "Silica Sand", density: 1600, coneAngle: 32, repose: 28, category: "Chemical" },
//   ],

//   // Plastics & Polymers
//   plastics: [
//     { name: "PVC Powder", density: 600, coneAngle: 45, repose: 40, category: "Plastic" },
//     { name: "PVC Pellets", density: 650, coneAngle: 30, repose: 27, category: "Plastic" },
//     { name: "PE Pellets", density: 550, coneAngle: 28, repose: 25, category: "Plastic" },
//     { name: "PP Pellets", density: 520, coneAngle: 28, repose: 25, category: "Plastic" },
//     { name: "PET Pellets", density: 800, coneAngle: 30, repose: 27, category: "Plastic" },
//     { name: "ABS Pellets", density: 650, coneAngle: 32, repose: 28, category: "Plastic" },
//     { name: "Nylon Pellets", density: 700, coneAngle: 30, repose: 27, category: "Plastic" },
//     { name: "Polystyrene Beads", density: 350, coneAngle: 35, repose: 30, category: "Plastic" },
//   ],

//   // Construction Materials
//   construction: [
//     { name: "Cement (Portland)", density: 1500, coneAngle: 40, repose: 35, category: "Cement" },
//     { name: "Cement (Bulk)", density: 1400, coneAngle: 42, repose: 37, category: "Cement" },
//     { name: "Sand (Dry)", density: 1600, coneAngle: 32, repose: 28, category: "Sand" },
//     { name: "Sand (Wet)", density: 1900, coneAngle: 25, repose: 22, category: "Sand" },
//     { name: "Gravel (Pea)", density: 1800, coneAngle: 30, repose: 27, category: "Aggregate" },
//     { name: "Crushed Stone", density: 1700, coneAngle: 35, repose: 32, category: "Aggregate" },
//     { name: "Fly Ash", density: 1100, coneAngle: 45, repose: 40, category: "Ash" },
//     { name: "Gypsum", density: 1300, coneAngle: 38, repose: 34, category: "Mineral" },
//   ],

//   // Food & Feed
//   food: [
//     { name: "Cocoa Powder", density: 500, coneAngle: 50, repose: 45, category: "Food" },
//     { name: "Coffee Beans", density: 650, coneAngle: 35, repose: 30, category: "Food" },
//     { name: "Tea Leaves", density: 300, coneAngle: 55, repose: 50, category: "Food" },
//     { name: "Milk Powder", density: 550, coneAngle: 48, repose: 43, category: "Food" },
//     { name: "Starch", density: 650, coneAngle: 42, repose: 38, category: "Food" },
//     { name: "Animal Feed Pellets", density: 650, coneAngle: 30, repose: 27, category: "Feed" },
//     { name: "Fish Meal", density: 600, coneAngle: 40, repose: 35, category: "Feed" },
//   ],

//   // Minerals & Ores
//   minerals: [
//     { name: "Iron Ore", density: 2500, coneAngle: 35, repose: 32, category: "Ore" },
//     { name: "Coal (Bituminous)", density: 800, coneAngle: 38, repose: 34, category: "Coal" },
//     { name: "Coal (Anthracite)", density: 900, coneAngle: 35, repose: 32, category: "Coal" },
//     { name: "Copper Ore", density: 2200, coneAngle: 40, repose: 35, category: "Ore" },
//     { name: "Bauxite", density: 1400, coneAngle: 35, repose: 32, category: "Ore" },
//     { name: "Clay", density: 1800, coneAngle: 45, repose: 40, category: "Clay" },
//   ],
// }

// // Function to get all materials
// const getAllMaterials = () => {
//   const allMaterials = []
//   Object.keys(bulkDensityDatabase).forEach((category) => {
//     allMaterials.push(...bulkDensityDatabase[category])
//   })
//   return allMaterials.sort((a, b) => a.name.localeCompare(b.name))
// }

// // Function to search materials
// const searchMaterials = (query) => {
//   const allMaterials = getAllMaterials()
//   return allMaterials.filter(
//     (material) =>
//       material.name.toLowerCase().includes(query.toLowerCase()) ||
//       material.category.toLowerCase().includes(query.toLowerCase()),
//   )
// }

// // Function to get materials by category
// const getMaterialsByCategory = (category) => {
//   return bulkDensityDatabase[category] || []
// }

// // Function to get material by name
// const getMaterialByName = (name) => {
//   const allMaterials = getAllMaterials()
//   return allMaterials.find((material) => material.name.toLowerCase() === name.toLowerCase())
// }

// // Function to get recommended silo parameters for material
// const getSiloParameters = (materialName) => {
//   const material = getMaterialByName(materialName)
//   if (!material) return null

//   return {
//     bulkDensity: material.density,
//     coneAngle: material.coneAngle,
//     angleOfRepose: material.repose,
//     recommendedUllage: calculateUllage(material.density, material.coneAngle),
//     flowCharacteristics: getFlowCharacteristics(material.coneAngle),
//     category: material.category,
//   }
// }

// // Calculate recommended ullage based on material properties
// const calculateUllage = (density, coneAngle) => {
//   // Higher density and steeper cone angles need more ullage
//   let baseUllage = 800 // mm

//   if (density > 1500) baseUllage += 200
//   if (coneAngle > 40) baseUllage += 300
//   if (coneAngle > 50) baseUllage += 200

//   return Math.min(baseUllage, 1500) // Cap at 1.5m
// }

// // Determine flow characteristics
// const getFlowCharacteristics = (coneAngle) => {
//   if (coneAngle < 30) return "Free Flowing"
//   if (coneAngle < 40) return "Good Flow"
//   if (coneAngle < 50) return "Fair Flow"
//   return "Poor Flow - May Bridge"
// }

// module.exports = {
//   bulkDensityDatabase,
//   getAllMaterials,
//   searchMaterials,
//   getMaterialsByCategory,
//   getMaterialByName,
//   getSiloParameters,
//   calculateUllage,
//   getFlowCharacteristics,
// }



// Real-world bulk density database for various materials
// Data sourced from engineering handbooks and industry standards

const bulkDensityDatabase = {
  // Agricultural Products
  agricultural: [
    { name: "Wheat", density: 780, coneAngle: 28, repose: 25, category: "Grain" },
    { name: "Corn (Maize)", density: 720, coneAngle: 25, repose: 23, category: "Grain" },
    { name: "Rice", density: 750, coneAngle: 30, repose: 27, category: "Grain" },
    { name: "Barley", density: 650, coneAngle: 26, repose: 24, category: "Grain" },
    { name: "Oats", density: 430, coneAngle: 32, repose: 28, category: "Grain" },
    { name: "Soybeans", density: 750, coneAngle: 27, repose: 25, category: "Grain" },
    { name: "Sunflower Seeds", density: 450, coneAngle: 35, repose: 30, category: "Seeds" },
    { name: "Rapeseed", density: 680, coneAngle: 30, repose: 27, category: "Seeds" },
    { name: "Sugar (Granulated)", density: 850, coneAngle: 35, repose: 32, category: "Sugar" },
    { name: "Sugar (Raw)", density: 960, coneAngle: 40, repose: 35, category: "Sugar" },
    { name: "Flour (Wheat)", density: 600, coneAngle: 45, repose: 40, category: "Flour" },
    { name: "Rice Flour", density: 580, coneAngle: 42, repose: 38, category: "Flour" },
  ],

  // Chemical & Pharmaceutical
  chemical: [
    { name: "Salt (Table Salt)", density: 1200, coneAngle: 35, repose: 32, category: "Salt" },
    { name: "Salt (Rock Salt)", density: 1300, coneAngle: 30, repose: 28, category: "Salt" },
    { name: "Sodium Chloride", density: 1200, coneAngle: 35, repose: 32, category: "Chemical" },
    { name: "Calcium Carbonate", density: 1500, coneAngle: 40, repose: 35, category: "Chemical" },
    { name: "Limestone (Crushed)", density: 1600, coneAngle: 35, repose: 32, category: "Chemical" },
    { name: "Activated Carbon", density: 400, coneAngle: 50, repose: 45, category: "Chemical" },
    { name: "Alumina", density: 1500, coneAngle: 38, repose: 34, category: "Chemical" },
    { name: "Silica Sand", density: 1600, coneAngle: 32, repose: 28, category: "Chemical" },
  ],

  // Plastics & Polymers
  plastics: [
    { name: "PVC Powder", density: 600, coneAngle: 45, repose: 40, category: "Plastic" },
    { name: "PVC Pellets", density: 650, coneAngle: 30, repose: 27, category: "Plastic" },
    { name: "PE Pellets", density: 550, coneAngle: 28, repose: 25, category: "Plastic" },
    { name: "PP Pellets", density: 520, coneAngle: 28, repose: 25, category: "Plastic" },
    { name: "PET Pellets", density: 800, coneAngle: 30, repose: 27, category: "Plastic" },
    { name: "ABS Pellets", density: 650, coneAngle: 32, repose: 28, category: "Plastic" },
    { name: "Nylon Pellets", density: 700, coneAngle: 30, repose: 27, category: "Plastic" },
    { name: "Polystyrene Beads", density: 350, coneAngle: 35, repose: 30, category: "Plastic" },
  ],

  // Construction Materials
  construction: [
    { name: "Cement (Portland)", density: 1500, coneAngle: 40, repose: 35, category: "Cement" },
    { name: "Cement (Bulk)", density: 1400, coneAngle: 42, repose: 37, category: "Cement" },
    { name: "Sand (Dry)", density: 1600, coneAngle: 32, repose: 28, category: "Sand" },
    { name: "Sand (Wet)", density: 1900, coneAngle: 25, repose: 22, category: "Sand" },
    { name: "Gravel (Pea)", density: 1800, coneAngle: 30, repose: 27, category: "Aggregate" },
    { name: "Crushed Stone", density: 1700, coneAngle: 35, repose: 32, category: "Aggregate" },
    { name: "Fly Ash", density: 1100, coneAngle: 45, repose: 40, category: "Ash" },
    { name: "Gypsum", density: 1300, coneAngle: 38, repose: 34, category: "Mineral" },
  ],

  // Food & Feed
  food: [
    { name: "Cocoa Powder", density: 500, coneAngle: 50, repose: 45, category: "Food" },
    { name: "Coffee Beans", density: 650, coneAngle: 35, repose: 30, category: "Food" },
    { name: "Tea Leaves", density: 300, coneAngle: 55, repose: 50, category: "Food" },
    { name: "Milk Powder", density: 550, coneAngle: 48, repose: 43, category: "Food" },
    { name: "Starch", density: 650, coneAngle: 42, repose: 38, category: "Food" },
    { name: "Animal Feed Pellets", density: 650, coneAngle: 30, repose: 27, category: "Feed" },
    { name: "Fish Meal", density: 600, coneAngle: 40, repose: 35, category: "Feed" },
  ],

  // Minerals & Ores
  minerals: [
    { name: "Iron Ore", density: 2500, coneAngle: 35, repose: 32, category: "Ore" },
    { name: "Coal (Bituminous)", density: 800, coneAngle: 38, repose: 34, category: "Coal" },
    { name: "Coal (Anthracite)", density: 900, coneAngle: 35, repose: 32, category: "Coal" },
    { name: "Copper Ore", density: 2200, coneAngle: 40, repose: 35, category: "Ore" },
    { name: "Bauxite", density: 1400, coneAngle: 35, repose: 32, category: "Ore" },
    { name: "Clay", density: 1800, coneAngle: 45, repose: 40, category: "Clay" },
  ],
}

// Function to get all materials
const getAllMaterials = () => {
  const allMaterials = []
  Object.keys(bulkDensityDatabase).forEach((category) => {
    allMaterials.push(...bulkDensityDatabase[category])
  })
  return allMaterials.sort((a, b) => a.name.localeCompare(b.name))
}

// Function to search materials
const searchMaterials = (query) => {
  const allMaterials = getAllMaterials()
  return allMaterials.filter(
    (material) =>
      material.name.toLowerCase().includes(query.toLowerCase()) ||
      material.category.toLowerCase().includes(query.toLowerCase()),
  )
}

// Function to get materials by category
const getMaterialsByCategory = (category) => {
  return bulkDensityDatabase[category] || []
}

// Function to get material by name
const getMaterialByName = (name) => {
  const allMaterials = getAllMaterials()
  return allMaterials.find((material) => material.name.toLowerCase() === name.toLowerCase())
}

// Function to get recommended silo parameters for material
const getSiloParameters = (materialName) => {
  const material = getMaterialByName(materialName)
  if (!material) return null

  return {
    bulkDensity: material.density,
    coneAngle: material.coneAngle,
    angleOfRepose: material.repose,
    recommendedUllage: calculateUllage(material.density, material.coneAngle),
    flowCharacteristics: getFlowCharacteristics(material.coneAngle),
    category: material.category,
  }
}

// Calculate recommended ullage based on material properties
const calculateUllage = (density, coneAngle) => {
  // Higher density and steeper cone angles need more ullage
  let baseUllage = 800 // mm

  if (density > 1500) baseUllage += 200
  if (coneAngle > 40) baseUllage += 300
  if (coneAngle > 50) baseUllage += 200

  return Math.min(baseUllage, 1500) // Cap at 1.5m
}

// Determine flow characteristics
const getFlowCharacteristics = (coneAngle) => {
  if (coneAngle < 30) return "Free Flowing"
  if (coneAngle < 40) return "Good Flow"
  if (coneAngle < 50) return "Fair Flow"
  return "Poor Flow - May Bridge"
}

module.exports = {
  bulkDensityDatabase,
  getAllMaterials,
  searchMaterials,
  getMaterialsByCategory,
  getMaterialByName,
  getSiloParameters,
  calculateUllage,
  getFlowCharacteristics,
}
