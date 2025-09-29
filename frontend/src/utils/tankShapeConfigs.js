// A single source of truth for all tank shape configurations.
// This must be kept in sync with the backend Mongoose schema.
export const getTankShapeOptions = () => [
  {
    value: "cylindrical",
    label: "Cylindrical Tank",
    orientations: ["vertical", "horizontal"],
    requiredDimensions: {
      // Backend schema allows diameter OR radius, but we ask for diameter for simplicity.
      // The validation function below handles the OR logic.
      vertical: ["height", "diameter"],
      horizontal: ["length", "diameter"],
    },
  },
  {
    value: "rectangular",
    label: "Rectangular Tank",
    orientations: ["vertical", "horizontal"],
    requiredDimensions: {
      vertical: ["height", "length", "width"],
      horizontal: ["height", "length", "width"],
    },
  },
  {
    value: "spherical",
    label: "Spherical Tank",
    orientations: ["vertical"],
    requiredDimensions: {
      // Backend schema allows diameter OR radius.
      // The validation function below handles the OR logic.
      vertical: ["radius"],
    },
  },
  {
    value: "silo",
    label: "Silo Tank",
    orientations: ["vertical"],
    materialType: "solid",
    requiredDimensions: {
      // This list is now complete to match the backend Mongoose schema.
      vertical: [
        "diameter",
        "totalHeight",
        "coneAngle",
        "ullage",
        "groundClearance",
        "outletDiameter",
      ],
    },
  },
  {
    value: "dish_ends",
    label: "Dish End Tank",
    orientations: ["horizontal"],
    requiredDimensions: {
      horizontal: ["length", "diameter", "dishRadius"],
    },
  },
  {
    value: "horizontal_capsule",
    label: "Horizontal Capsule",
    orientations: ["horizontal"],
    requiredDimensions: {
      horizontal: ["capsuleLength", "diameter"],
    },
  },
  {
    value: "vertical_capsule",
    label: "Vertical Capsule",
    orientations: ["vertical"],
    requiredDimensions: {
      vertical: ["height", "diameter"],
    },
  },
  {
    value: "horizontal_oval",
    label: "Horizontal Oval",
    orientations: ["horizontal"],
    requiredDimensions: {
      horizontal: ["length", "majorAxis", "minorAxis"],
    },
  },
  {
    value: "vertical_oval",
    label: "Vertical Oval",
    orientations: ["vertical"],
    requiredDimensions: {
      vertical: ["height", "majorAxis", "minorAxis"],
    },
  },
  {
    value: "conical",
    label: "Conical Tank",
    orientations: ["vertical"],
    requiredDimensions: {
      vertical: ["height", "diameter", "coneAngle"],
    },
  },
  {
    value: "horizontal_elliptical",
    label: "Horizontal Elliptical",
    orientations: ["horizontal"],
    requiredDimensions: {
      horizontal: ["length", "majorAxis", "minorAxis"],
    },
  },
  {
    value: "custom",
    label: "Custom Shape",
    orientations: ["vertical"],
    requiredDimensions: {
      vertical: ["height", "length", "width"], // Provide a base for custom shapes
    },
  },
];

// Helper function to validate tank dimensions, now perfectly aligned with the backend's inferred needs
export const validateTankDimensions = (shape, dimensions, orientation) => {
  const errors = [];
  const shapeConfig = getTankShapeOptions().find((s) => s.value === shape);

  if (!shapeConfig) {
    errors.push("Invalid tank shape");
    return errors;
  }

  // Handle shapes with flexible dimension inputs (diameter or radius)
  if (shape === "cylindrical") {
    const requiredDims = shapeConfig.requiredDimensions[orientation];
    if (requiredDims.includes("height") && (!dimensions.height || isNaN(Number(dimensions.height)) || Number(dimensions.height) <= 0)) {
      errors.push("Height is required for Cylindrical Tank");
    }
    if (requiredDims.includes("length") && (!dimensions.length || isNaN(Number(dimensions.length)) || Number(dimensions.length) <= 0)) {
      errors.push("Length is required for Cylindrical Tank");
    }
    if (!dimensions.diameter && !dimensions.radius) {
      errors.push("Diameter or Radius is required for Cylindrical Tank");
    }
  } else if (shape === "spherical") {
    if (!dimensions.radius && !dimensions.diameter) {
      errors.push("Radius or Diameter is required for Spherical Tank");
    }
  } else {
    // For all other shapes, use the list from the config directly.
    const requiredDims = shapeConfig.requiredDimensions[orientation] || shapeConfig.requiredDimensions.vertical;
    requiredDims.forEach((dim) => {
      const value = dimensions[dim];
      const isValid = value !== null && !isNaN(Number(value)) && Number(value) > 0;
      if (!isValid) {
        // Generates a more readable error message (e.g., "Total Height")
        const readableDim = dim.replace(/([A-Z])/g, ' $1').toLowerCase().replace(/^\w/, c => c.toUpperCase());
        errors.push(`${readableDim} is required for a ${shapeConfig.label}`);
      }
    });
  }

  return errors;
};

// Sensor type options for device selection
export const getSensorTypeOptions = () => [
  {
    value: "ultrasonic_level_sensor",
    label: "Ultrasonic Level Sensor",
    description: "Non-contact measurement using ultrasonic waves",
    requiresOffset: true,
    accuracy: "±0.25%",
    range: "0.3m to 15m",
    applications: ["liquid", "solid"],
  },
  {
    value: "radar_level_sensor",
    label: "Radar Level Sensor",
    description: "High accuracy measurement using radar waves",
    requiresOffset: true,
    accuracy: "±1mm",
    range: "0.2m to 70m",
    applications: ["liquid", "solid", "gas"],
  },
  {
    value: "laser_level_sensor",
    label: "Laser Level Sensor",
    description: "Precision measurement using laser technology",
    requiresOffset: true,
    accuracy: "±0.1%",
    range: "0.05m to 500m",
    applications: ["liquid", "solid"],
  },
  {
    value: "pressure_sensor",
    label: "Pressure Sensor",
    description: "Hydrostatic pressure measurement",
    requiresOffset: false,
    accuracy: "±0.1%",
    range: "0 to 1000 bar",
    applications: ["liquid"],
  },
  {
    value: "capacitive_sensor",
    label: "Capacitive Level Sensor",
    description: "Continuous level measurement using capacitance",
    requiresOffset: false,
    accuracy: "±0.5%",
    range: "0.1m to 10m",
    applications: ["liquid", "solid"],
  },
  {
    value: "float_switch",
    label: "Float Switch",
    description: "Simple on/off level detection",
    requiresOffset: false,
    accuracy: "Point level",
    range: "Variable",
    applications: ["liquid"],
  },
  {
    value: "load_cell",
    label: "Load Cell",
    description: "Weight-based level measurement",
    requiresOffset: false,
    accuracy: "±0.02%",
    range: "0 to 500 tons",
    applications: ["liquid", "solid"],
  },
  {
    value: "vibrating_fork",
    label: "Vibrating Fork",
    description: "Point level detection using vibration",
    requiresOffset: false,
    accuracy: "Point level",
    range: "Variable",
    applications: ["liquid", "solid"],
  },
];

// Bulk density options for solid materials - FIXED STRUCTURE
export const getBulkDensityOptions = () => [
  // Grains and Cereals
  { material: "Wheat", density: 720, category: "Grains & Cereals", coneAngle: 30, ullage: 0.5 },
  { material: "Corn (Maize)", density: 600, category: "Grains & Cereals", coneAngle: 25, ullage: 0.4 },
  { material: "Barley", density: 650, category: "Grains & Cereals", coneAngle: 28, ullage: 0.5 },
  { material: "Oats", density: 400, category: "Grains & Cereals", coneAngle: 35, ullage: 0.6 },
  { material: "Rice", density: 750, category: "Grains & Cereals", coneAngle: 32, ullage: 0.4 },
  { material: "Soybeans", density: 680, category: "Grains & Cereals", coneAngle: 30, ullage: 0.5 },
  { material: "Sunflower Seeds", density: 800, category: "Grains & Cereals", coneAngle: 28, ullage: 0.4 },

  // Powders and Fine Materials
  { material: "Flour", density: 500, category: "Powders & Fine Materials", coneAngle: 45, ullage: 0.8 },
  { material: "Sugar", density: 900, category: "Powders & Fine Materials", coneAngle: 40, ullage: 0.6 },
  { material: "Salt", density: 600, category: "Powders & Fine Materials", coneAngle: 35, ullage: 0.5 },
  { material: "Cement", density: 1500, category: "Powders & Fine Materials", coneAngle: 50, ullage: 0.7 },
  { material: "Cocoa Powder", density: 400, category: "Powders & Fine Materials", coneAngle: 45, ullage: 0.8 },
  { material: "Milk Powder", density: 350, category: "Powders & Fine Materials", coneAngle: 50, ullage: 0.9 },
  { material: "Baking Soda", density: 450, category: "Powders & Fine Materials", coneAngle: 42, ullage: 0.7 },

  // Pellets and Granules
  { material: "Wood Pellets", density: 650, category: "Pellets & Granules", coneAngle: 25, ullage: 0.3 },
  { material: "Plastic Pellets (PE)", density: 700, category: "Pellets & Granules", coneAngle: 22, ullage: 0.3 },
  { material: "Plastic Pellets (PVC)", density: 800, category: "Pellets & Granules", coneAngle: 20, ullage: 0.2 },
  { material: "Animal Feed Pellets", density: 600, category: "Pellets & Granules", coneAngle: 28, ullage: 0.4 },
  { material: "Fertilizer Granules", density: 1200, category: "Pellets & Granules", coneAngle: 30, ullage: 0.4 },

  // Minerals and Ores
  { material: "Sand (Dry)", density: 1600, category: "Minerals & Ores", coneAngle: 35, ullage: 0.3 },
  { material: "Sand (Wet)", density: 1800, category: "Minerals & Ores", coneAngle: 40, ullage: 0.2 },
  { material: "Gravel", density: 1500, category: "Minerals & Ores", coneAngle: 30, ullage: 0.2 },
  { material: "Limestone", density: 2700, category: "Minerals & Ores", coneAngle: 45, ullage: 0.3 },
  { material: "Coal", density: 1300, category: "Minerals & Ores", coneAngle: 35, ullage: 0.4 },
  { material: "Iron Ore", density: 5000, category: "Minerals & Ores", coneAngle: 40, ullage: 0.2 },
  { material: "Silica Sand", density: 2600, category: "Minerals & Ores", coneAngle: 38, ullage: 0.3 },

  // Chemicals
  { material: "Sodium Chloride", density: 1200, category: "Chemicals", coneAngle: 35, ullage: 0.4 },
  { material: "Calcium Carbonate", density: 2200, category: "Chemicals", coneAngle: 42, ullage: 0.5 },
  { material: "Sodium Bicarbonate", density: 1700, category: "Chemicals", coneAngle: 38, ullage: 0.4 },
  { material: "Potassium Chloride", density: 900, category: "Chemicals", coneAngle: 32, ullage: 0.5 },
  { material: "Ammonium Sulfate", density: 1400, category: "Chemicals", coneAngle: 40, ullage: 0.4 },

  // Food Products
  { material: "Coffee Beans", density: 550, category: "Food Products", coneAngle: 25, ullage: 0.3 },
  { material: "Tea Leaves", density: 400, category: "Food Products", coneAngle: 45, ullage: 0.7 },
  { material: "Peanuts", density: 320, category: "Food Products", coneAngle: 30, ullage: 0.5 },
  { material: "Almonds", density: 450, category: "Food Products", coneAngle: 28, ullage: 0.4 },
  { material: "Dried Beans", density: 800, category: "Food Products", coneAngle: 32, ullage: 0.4 },
  { material: "Honey Powder", density: 1400, category: "Food Products", coneAngle: 48, ullage: 0.6 },
];

// Helper function to get sensor types that require offset
export const getSensorTypesRequiringOffset = () => {
  return getSensorTypeOptions()
    .filter((sensor) => sensor.requiresOffset)
    .map((sensor) => sensor.value);
};

// Helper function to get sensors suitable for specific material types
export const getSensorTypesForMaterial = (materialType) => {
  return getSensorTypeOptions().filter((sensor) =>
    sensor.applications.includes(materialType),
  );
};

// Helper function to find bulk density by material name
export const findBulkDensityByMaterial = (materialName) => {
  const allMaterials = getBulkDensityOptions();
  return allMaterials.find((material) =>
    material.material.toLowerCase().includes(materialName.toLowerCase()),
  );
};

// Helper function to get bulk density options grouped by category
export const getBulkDensityOptionsByCategory = () => {
  const materials = getBulkDensityOptions();
  const categories = {};

  materials.forEach((material) => {
    if (!categories[material.category]) {
      categories[material.category] = [];
    }
    categories[material.category].push(material);
  });

  return categories;
};