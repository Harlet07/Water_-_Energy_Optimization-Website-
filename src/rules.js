const OPTIMIZATION_TEMPLATES = {
    // Electricity
    AC_AGE: {
        issue: "Old Air Conditioner",
        action: "Your AC is over {age} years old. Consider servicing it or upgrading to a new, energy-efficient 5-star model.",
        effort: "High",
        severity: "High"
    },
    AC_RATING: {
        issue: "Inefficient Air Conditioner",
        action: "Your AC has a low star rating ({rating}-star). Upgrading to a 5-star model can significantly reduce your electricity bill.",
        effort: "High",
        severity: "High"
    },
    GEYSER_AGE: {
        issue: "Old Geyser",
        action: "Your geyser is over {age} years old. Older geysers can be inefficient. Consider replacing it with a new, 5-star rated model.",
        effort: "High",
        severity: "Medium"
    },
    GEYSER_RATING: {
        issue: "Inefficient Geyser",
        action: "Your geyser has a low star rating ({rating}-star). A 5-star rated geyser will save a lot of energy.",
        effort: "High",
        severity: "Medium"
    },
    REFRIGERATOR_AGE: {
        issue: "Old Refrigerator",
        action: "Your refrigerator is over {age} years old. Newer models are much more energy-efficient.",
        effort: "High",
        severity: "Low"
    },
    REFRIGERATOR_RATING: {
        issue: "Inefficient Refrigerator",
        action: "Your refrigerator has a low star rating ({rating}-star). Consider a 5-star model for your next purchase.",
        effort: "High",
        severity: "Low"
    },
    LIGHTING_TYPE: {
        issue: "Inefficient Lighting",
        action: "You are using {type} lights. Switching to LED lights can save up to 80% on lighting costs.",
        effort: "Low",
        severity: "Medium"
    },

    // Water
    SHOWER_FLOW: {
        issue: "High-flow Shower",
        action: "Your shower has a high flow rate. Installing a low-flow showerhead can save a significant amount of water.",
        effort: "Low",
        severity: "High"
    },
    TOILET_FLUSH: {
        issue: "Inefficient Toilet Flush",
        action: "You are using a single-flush toilet. Upgrading to a dual-flush system can reduce water usage for flushing by half.",
        effort: "Medium",
        severity: "Medium"
    },
    GARDENING_WATERING: {
        issue: "Inefficient Garden Watering",
        action: "You have a {size} garden. Using a drip irrigation system instead of a hose can save a lot of water.",
        effort: "Medium",
        severity: "Low"
    }
};

function detectInefficiencies(profile, usage) {
    const inefficiencies = [];

    // Electricity Rules
    if (usage.electricity.acAge > 10) {
        inefficiencies.push({ cause: 'AC_AGE', severity: 'High', data: { age: usage.electricity.acAge } });
    }
    if (usage.electricity.acStarRating < 3) {
        inefficiencies.push({ cause: 'AC_RATING', severity: 'High', data: { rating: usage.electricity.acStarRating } });
    }
    if (usage.electricity.geyserAge > 8) {
        inefficiencies.push({ cause: 'GEYSER_AGE', severity: 'Medium', data: { age: usage.electricity.geyserAge } });
    }
    if (usage.electricity.geyserStarRating < 3) {
        inefficiencies.push({ cause: 'GEYSER_RATING', severity: 'Medium', data: { rating: usage.electricity.geyserStarRating } });
    }
    if (usage.electricity.refrigeratorAge > 10) {
        inefficiencies.push({ cause: 'REFRIGERATOR_AGE', severity: 'Low', data: { age: usage.electricity.refrigeratorAge } });
    }
    if (usage.electricity.refrigeratorStarRating < 3) {
        inefficiencies.push({ cause: 'REFRIGERATOR_RATING', severity: 'Low', data: { rating: usage.electricity.refrigeratorStarRating } });
    }
    if (usage.electricity.lightingType !== 'led') {
        inefficiencies.push({ cause: 'LIGHTING_TYPE', severity: 'Medium', data: { type: usage.electricity.lightingType.toUpperCase() } });
    }

    // Water Rules
    if (usage.water.bathing === 'shower' && usage.water.showerFlowRate === 'high') {
        inefficiencies.push({ cause: 'SHOWER_FLOW', severity: 'High' });
    }
    if (usage.water.toiletFlushType === 'single') {
        inefficiencies.push({ cause: 'TOILET_FLUSH', severity: 'Medium' });
    }
    if (usage.water.gardening === 'yes' && usage.water.gardenSize !== 'small') {
        inefficiencies.push({ cause: 'GARDENING_WATERING', severity: 'Low', data: { size: usage.water.gardenSize } });
    }

    return inefficiencies;
}

function getOptimizationActions(inefficiencies) {
    return inefficiencies.map(inefficiency => {
        const template = OPTIMIZATION_TEMPLATES[inefficiency.cause];
        if (!template) return null;

        let action = template.action;
        if (inefficiency.data) {
            for (const key in inefficiency.data) {
                action = action.replace(`{${key}}`, inefficiency.data[key]);
            }
        }

        // Simplified savings calculation
        let savings = '';
        if (inefficiency.cause.includes('AC')) savings = "~50-100 kWh/month";
        else if (inefficiency.cause.includes('GEYSER')) savings = "~30-50 kWh/month";
        else if (inefficiency.cause.includes('REFRIGERATOR')) savings = "~15-30 kWh/month";
        else if (inefficiency.cause.includes('LIGHTING')) savings = "~20-40 kWh/month";
        else if (inefficiency.cause.includes('SHOWER')) savings = "~500-1000 Liters/month";
        else if (inefficiency.cause.includes('TOILET')) savings = "~300-600 Liters/month";
        else if (inefficiency.cause.includes('GARDENING')) savings = "~200-500 Liters/month";

        return {
            ...template,
            action,
            savings,
        };
    }).filter(Boolean);
}

module.exports = { detectInefficiencies, getOptimizationActions };