const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { calculateConsumption } = require('./calculations');
const { detectInefficiencies, getOptimizationActions } = require('./rules');

const dataPath = path.join(__dirname, '..', 'data');
// Ensure the data directory exists
if (!fs.existsSync(dataPath)) {
    fs.mkdirSync(dataPath, { recursive: true });
}
const usersFilePath = path.join(dataPath, 'users.json');
const usageFilePath = path.join(dataPath, 'usage.json');

// Helper function to read a JSON file
const readJsonFile = (filePath, callback) => {
    fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
            if (err.code === 'ENOENT') {
                return callback(null, []); // File doesn't exist, start with an empty array
            }
            return callback(err);
        }
        // If the file is empty, return an empty array
        if (data.trim() === '') {
            return callback(null, []);
        }
        try {
            const json = JSON.parse(data);
            callback(null, json);
        } catch (parseErr) {
            callback(parseErr);
        }
    });
};

// Helper function to write to a JSON file
const writeJsonFile = (filePath, data, callback) => {
    fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8', callback);
};


// Middleware to parse JSON bodies
router.use(express.json());

// Generate a unique user ID
const generateUserId = () => `user_${new Date().getTime()}_${Math.random().toString(36).substr(2, 9)}`;

// Endpoint to create a user profile
router.post('/profile', (req, res) => {
    const userId = generateUserId();
    const profileData = { id: userId, ...req.body, createdAt: new Date().toISOString() };

    readJsonFile(usersFilePath, (err, users) => {
        if (err) return res.status(500).json({ message: "Error reading user data." });
        users.push(profileData);
        writeJsonFile(usersFilePath, users, (err) => {
            if (err) return res.status(500).json({ message: "Error saving user data." });
            res.status(201).json(profileData);
        });
    });
});

// Endpoint to receive usage data
router.post('/usage', (req, res) => {
    const { userId, usage } = req.body;
    if (!userId) {
        return res.status(400).json({ message: "User ID is required." });
    }
    const usageData = { userId, usage, date: new Date().toISOString() };
    
    readJsonFile(usageFilePath, (err, usages) => {
        if (err) return res.status(500).json({ message: "Error reading usage data." });
        usages.push(usageData);
        writeJsonFile(usageFilePath, usages, (err) => {
            if (err) return res.status(500).json({ message: "Error saving usage data." });
            res.status(200).json({ message: "Usage data received.", data: usageData });
        });
    });
});

// Endpoint to get all logs
router.get('/logs', (req, res) => {
    readJsonFile(usersFilePath, (err, users) => {
        if (err) return res.status(500).json({ message: "Error reading user logs." });
        
        readJsonFile(usageFilePath, (err, usages) => {
            if (err) return res.status(500).json({ message: "Error reading usage logs." });
            
            const usersById = users.reduce((acc, user) => {
                acc[user.id] = user;
                return acc;
            }, {});

            const usagesWithConsumption = usages.map(usage => {
                const user = usersById[usage.userId];
                if (user) {
                    const consumption = calculateConsumption(user, usage.usage);
                    return { ...usage, consumption };
                }
                return usage;
            });

            const logs = {
                users,
                usages: usagesWithConsumption
            };
            res.status(200).json(logs);
        });
    });
});

// Endpoint to calculate consumption
router.post('/calculate', (req, res) => {
    const usageData = req.body;
    const consumption = calculateConsumption(usageData.profile, usageData.usage);
    res.status(200).json(consumption);
});

// Endpoint to get optimization actions
router.post('/optimize', (req, res) => {
    const { profile, usage } = req.body;
    const inefficiencies = detectInefficiencies(profile, usage);
    const optimizationActions = getOptimizationActions(inefficiencies);
    res.status(200).json({ inefficiencies, optimizationActions });
});

// Endpoint for progress tracking
router.get('/progress/:userId', (req, res) => {
    // This is a placeholder for fetching progress data
    res.status(200).json({ message: `Fetching progress for user ${req.params.userId}` });
});

module.exports = router;
