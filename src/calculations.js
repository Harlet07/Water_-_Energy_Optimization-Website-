const { TARIFFS } = require('./tariffs');

// Hardcoded average appliance ratings and water usage values
const APPLIANCE_RATINGS = {
    AC: 1.5, // kW
    GEYSER: 2.0, // kW
    FAN: 0.075, // kW
    WASHING_MACHINE_SEMI_AUTOMATIC: 0.3, // kWh/cycle
    WASHING_MACHINE_TOP_LOAD: 0.5, // kWh/cycle
    WASHING_MACHINE_FRONT_LOAD: 0.4, // kWh/cycle
    REFRIGERATOR_SINGLE: 1.0, // kWh/day
    REFRIGERATOR_DOUBLE: 1.5, // kWh/day
    LIGHTING_LED: 0.01, // kW for a standard LED bulb
    LIGHTING_CFL: 0.015, // kW for a standard CFL bulb
    LIGHTING_TUBE: 0.04, // kW for a standard Tube light
};

const WATER_USAGE = {
    BUCKET_BATH: 40, // Liters
    SHOWER_BATH_MEDIUM: 80, // Liters
    TOILET_FLUSH_SINGLE: 10, // Liters
    CLOTHES_WASHING: 70, // Liters/load
    PUMP_USAGE: 10, // Liters/min
    GARDENING_MEDIUM: 50, // Liters/day for a small garden
};

const STAR_RATING_MULTIPLIERS = {
    1: 1.2,
    2: 1.1,
    3: 1.0,
    4: 0.9,
    5: 0.8,
};

const AGE_MULTIPLIER_PER_YEAR = 0.02;

function getAdjustedApplianceConsumption(baseConsumption, starRating, age) {
    let adjustedConsumption = baseConsumption;
    adjustedConsumption *= STAR_RATING_MULTIPLIERS[starRating] || 1.0;
    adjustedConsumption *= (1 + (AGE_MULTIPLIER_PER_YEAR * (age || 0)));
    return adjustedConsumption;
}

function calculateConsumption(profile, usage) {
    // --- Electricity Calculation (kWh/month) ---
    let totalElectricity = 0;

    // AC
    const acBaseConsumption = (usage.electricity.acUsage || 0) * APPLIANCE_RATINGS.AC * 30;
    totalElectricity += getAdjustedApplianceConsumption(acBaseConsumption, usage.electricity.acStarRating, usage.electricity.acAge);

    // Geyser
    const geyserBaseConsumption = (usage.electricity.geyserUsage || 0) / 60 * APPLIANCE_RATINGS.GEYSER * 30;
    totalElectricity += getAdjustedApplianceConsumption(geyserBaseConsumption, usage.electricity.geyserStarRating, usage.electricity.geyserAge);

    // Refrigerator
    const fridgeRating = usage.electricity.refrigeratorType === 'double' ? APPLIANCE_RATINGS.REFRIGERATOR_DOUBLE : APPLIANCE_RATINGS.REFRIGERATOR_SINGLE;
    const fridgeBaseConsumption = fridgeRating * 30;
    totalElectricity += getAdjustedApplianceConsumption(fridgeBaseConsumption, usage.electricity.refrigeratorStarRating, usage.electricity.refrigeratorAge);

    // Washing Machine
    const washingMachineRatingKey = `WASHING_MACHINE_${(usage.electricity.washingMachineType || 'top-load').toUpperCase()}`;
    const washingMachineRating = APPLIANCE_RATINGS[washingMachineRatingKey] || APPLIANCE_RATINGS.WASHING_MACHINE_TOP_LOAD;
    const washingMachineUnits = (usage.electricity.washingMachineCycles || 0) * washingMachineRating * 4; // 4 weeks in a month
    totalElectricity += washingMachineUnits;

    // Lighting
    const lightingRating = APPLIANCE_RATINGS[`LIGHTING_${usage.electricity.lightingType.toUpperCase()}`] || 0;
    totalElectricity += lightingRating * (usage.electricity.fanCount || 1) * (usage.electricity.lightingDuration || 6) * 30;

    // Fans
    const fanUnits = (usage.electricity.fanCount || 0) * APPLIANCE_RATINGS.FAN * (usage.electricity.fanDuration || 8) * 30;
    totalElectricity += fanUnits;

    // --- Water Calculation (Liters/day) ---
    let totalWater = 0;
    const residents = parseInt(profile.residents, 10) || 1;

    // Bathing
    let bathWater = usage.water.bathing === 'shower' ? WATER_USAGE.SHOWER_BATH_MEDIUM : WATER_USAGE.BUCKET_BATH;
    if (usage.water.bathing === 'shower') {
        if (usage.water.showerFlowRate === 'low') bathWater *= 0.8;
        if (usage.water.showerFlowRate === 'high') bathWater *= 1.2;
    }
    totalWater += bathWater * (usage.water.bathFrequency || 1) * residents;

    // Toilet
    let toiletWater = WATER_USAGE.TOILET_FLUSH_SINGLE;
    if (usage.water.toiletFlushType === 'dual') {
        toiletWater *= 0.75; // Assuming dual flush uses 25% less water on average
    }
    totalWater += toiletWater * (usage.water.toiletFlushes || 1) * residents;

    // Washing Clothes (distributing weekly cycles to daily)
    totalWater += (usage.water.washingClothes || 0) * WATER_USAGE.CLOTHES_WASHING / 7 * residents;

    // Pump
    totalWater += (usage.water.pumpUsage || 0) * WATER_USAGE.PUMP_USAGE;
    
    // Gardening
    if (usage.water.gardening === 'yes') {
        let gardeningWater = WATER_USAGE.GARDENING_MEDIUM;
        if (usage.water.gardenSize === 'small') gardeningWater *= 0.5;
        if (usage.water.gardenSize === 'large') gardeningWater *= 1.5;
        totalWater += gardeningWater;
    }

    // Water Leakage Penalty
    if (usage.water.waterLeakage === 'yes') {
        totalWater *= 1.10; // 10% penalty for water leakage
    }
    
    // --- Cost Calculation ---
    const region = profile.region || 'OTHER';
    const electricityTariff = TARIFFS.ELECTRICITY[region] || TARIFFS.ELECTRICITY.OTHER;
    const waterTariff = TARIFFS.WATER[region] || TARIFFS.WATER.OTHER;

    const electricityCost = totalElectricity * electricityTariff;
    const waterCost = (totalWater * 30 / 1000) * waterTariff; // Monthly water cost

    // Efficiency Classification
    const electricityPerPerson = totalElectricity / residents;
    const waterPerPerson = totalWater / residents;

    let electricityEfficiency, waterEfficiency;

    if (electricityPerPerson <= 120) electricityEfficiency = 'Efficient';
    else if (electricityPerPerson <= 200) electricityEfficiency = 'Moderate';
    else if (electricityPerPerson <= 300) electricityEfficiency = 'Inefficient';
    else electricityEfficiency = 'Highly Inefficient';

    if (waterPerPerson <= 135) waterEfficiency = 'Efficient';
    else if (waterPerPerson <= 180) waterEfficiency = 'Moderate';
    else if (waterPerPerson <= 250) waterEfficiency = 'Inefficient';
    else waterEfficiency = 'Highly Inefficient';


    return {
        electricity: {
            total: totalElectricity.toFixed(2),
            perPerson: electricityPerPerson.toFixed(2),
            efficiency: electricityEfficiency,
            cost: electricityCost.toFixed(2),
        },
        water: {
            total: totalWater.toFixed(2),
            perPerson: waterPerPerson.toFixed(2),
            efficiency: waterEfficiency,
            cost: waterCost.toFixed(2),
        }
    };
}

module.exports = { calculateConsumption };