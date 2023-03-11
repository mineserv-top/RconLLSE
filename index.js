ll.registerPlugin('RConLLSE', 'Поддержка протокола RCon для LLBDS от MineServ', [1,0,0])
const net = require('net')
const iconv = require('iconv-lite')
const config_file = new JsonConfigFile('./plugins/RConLLSE/config.json')
if(!config_file.get('RConServer')){
    logger.warn(`Конфигурационный файл не найден, создаю!`)
    config_file.init('RConServer', {
        port: 25575,
        password: 'UltraMoshniyParol228!!!'
    })
    logger.warn(`Конфигурационный файл создан и находится в \x1b[1m\x1b[32m"./plugins/RConLLSE/config.json"\x1b[0m!`)
}
const config = config_file.get('RConServer')
const SERVERDATA_AUTH = 3
const SERVERDATA_AUTH_RESPONSE = 2
const SERVERDATA_EXECCOMMAND = 2
const SERVERDATA_RESPONSE_VALUE = 0
class RconServer {
    constructor(port, password){
        this.port = port
        this.password = password
        this.clients = []
        this.server = net.createServer((socket)=>{
            logger.debug(`Клиент < ${socket.remoteAddress}:${socket.remotePort} > подключился`)
            const client = {
                socket,
                authenticated: false
            }
            this.clients.push(client)
            socket.on('data',(fullData)=>{
                while (fullData.length >= 4) {
                    const packetSize = fullData.readInt32LE(0)
                    if (fullData.length < packetSize){
                        break
                    }
                    const packetType = fullData.readInt32LE(8)
                    if (packetType === SERVERDATA_AUTH){
                        const requestId = fullData.readInt32LE(4)
                        const passwordBytes = fullData.slice(12, packetSize + 2)
                        const password = iconv.decode(passwordBytes, 'utf8').trim()
                        if (password === this.password){
                            client.authenticated = true
                            logger.debug(`Клиент < ${socket.remoteAddress}:${socket.remotePort} > аутентифицировался`)
                            const response = Buffer.alloc(packetSize)
                            response.writeInt32LE(packetSize - 4, 0)
                            response.writeInt32LE(requestId, 4)
                            response.writeInt32LE(SERVERDATA_AUTH_RESPONSE, 8)
                            response.writeUInt16LE(0, 12)
                            socket.write(response)
                        } else {
                            logger.debug(`Клиент < ${socket.remoteAddress}:${socket.remotePort} > не аутентифицировался`)
                            const response = Buffer.alloc(packetSize)
                            response.writeInt32LE(packetSize - 4, 0)
                            response.writeInt32LE(requestId, 4)
                            response.writeInt32LE(SERVERDATA_RESPONSE_VALUE, 8)
                            response.writeUInt16LE(0, 12)
                            response.write('Invalid password', 14, 'utf8')
                            response.writeInt8(0, packetSize - 1)
                            socket.write(response)
                            socket.end()
                            return
                        }
                    } else if (client.authenticated && packetType === SERVERDATA_EXECCOMMAND) {
                        const requestId = fullData.readInt32LE(4);
                        const commandBuffer = fullData.slice(12);
                        const command = commandBuffer.toString('utf8');
                        logger.info(`Клиент < ${socket.remoteAddress}:${socket.remotePort} > передал команду : ${command}`);
                        const str = mc.runcmdEx(command);
                        const responseLength = 14 + Buffer.byteLength(str.output, 'utf8') + 1;
                        const response = Buffer.alloc(responseLength);
                        response.writeInt32LE(responseLength - 4, 0);
                        response.writeInt32LE(requestId, 4);
                        response.writeInt32LE(SERVERDATA_RESPONSE_VALUE, 8);
                        response.write(str.output, 12, 'utf8');
                        response.writeInt8(0, responseLength - 1);
                        socket.write(response);
                      }
                    fullData = fullData.slice(packetSize)
                }
            })
            socket.on('end',()=>{
                logger.debug(`Клиент < ${socket.remoteAddress}:${socket.remotePort} > отключился`)
                this.clients.splice(this.clients.indexOf(client), 1)
            })
        })
        this.server.on('error', (err)=>{
            logger.error(logger.debug(`Произошла ошибка > ${err}`))
        })
        this.server.listen(this.port, () => {
            logger.info(`RCon сервер запущен на порту \x1b[1m\x1b[33m${this.port}\x1b[0m.`)
            logger.info(`Сменить порт и пароль можно в \x1b[1m\x1b[33m"./plugins/RConLLSE/config.json"\x1b[0m!`)
        })
    }
    stop(){
        for (const client of this.clients){
            client.socket.end()
        }
        this.server.close();
        logger.info(`RCon сервер остановлен!`)
    }
}
const rconServer = new RconServer(config.port, config.password)
mc.listen("onConsoleCmd",(cmd) => {
    if(cmd === 'll reload' || cmd === 'll reload RConLLSE'){
        rconServer.stop()
    }
})