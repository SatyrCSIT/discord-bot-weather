const config = require('../config/config');

class Logger {
    static info(message, data = null) {
        console.log(`ℹ️ [INFO] ${new Date().toISOString()}: ${message}`);
        if (data) console.log(data);
    }
    
    static error(message, error = null) {
        console.error(`❌ [ERROR] ${new Date().toISOString()}: ${message}`);
        if (error) console.error(error);
    }
    
    static warn(message, data = null) {
        console.warn(`⚠️ [WARN] ${new Date().toISOString()}: ${message}`);
        if (data) console.warn(data);
    }
    
    static debug(message, data = null) {
        if (process.env.NODE_ENV !== 'production') {
            console.log(`🐛 [DEBUG] ${new Date().toISOString()}: ${message}`);
            if (data) console.log(data);
        }
    }
}

module.exports = Logger;