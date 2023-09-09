// Register the RConLLSE plugin with version information.
ll.registerPlugin('RConLLSE', 'RCon protocol support for LLBDS', [1, 0, 0]);

// Create a configuration file object for RCon settings.
const config_file = new JsonConfigFile('./plugins/RConLLSE/config.json');

// Check if the RConServer configuration exists; if not, create it.
if (!config_file.get('RConServer')) {
    logger.warn(`Config file not found, creating!`);

    // Initialize the RConServer configuration with default values.
    config_file.init('RConServer', {
        port: 25575,
        password: 'Ur_mother_name_its_not_a_password',
    });

    logger.warn(`Config file created in \x1b[1m\x1b[32m"./plugins/RConLLSE/config.json"\x1b[0m!`);
}

// Retrieve the RConServer configuration.
const config = config_file.get('RConServer');

// Import the RConServer class.
const RconServer = require('./classes/RCon');

// Create an instance of the RConServer class with the specified configuration.
const rconServer = new RconServer(config.port, config.password);

// Listen for the "onConsoleCmd" event in Minecraft.
mc.listen("onConsoleCmd", (cmd) => {
    // If the console command is 'll reload' or 'll reload RConLLSE', stop the RCon server.
    if (cmd === 'll reload' || cmd === 'll reload RConLLSE') {
        rconServer.stop();
    }
});
