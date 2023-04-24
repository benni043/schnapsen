import * as express from 'express';
import * as http from 'http';
import * as cors from 'cors';
import {Server} from "socket.io";
import {Join, State, UserData} from "../../../sources/utils";
import {ServiceSchnapsen} from "./service.schnapsen";

export class RouterSchnapsen {
    serviceSchnapsen: ServiceSchnapsen = new ServiceSchnapsen();

    app = express();
    server = http.createServer(this.app);
    socketIO = new Server(this.server, {cors: {origin: true}});
    port = 3000;

    constructor() {
        this.app.use(cors());

        this.socketIO.on('connection', (ws) => {
            ws.on("join", (joinData: UserData) => {
                let joinDataRouter: Join = this.serviceSchnapsen.join(joinData);

                switch (joinDataRouter.state) {
                    case State.joining: {
                        joinDataRouter.ws1!.emit("joining");
                        return
                    }
                    case State.running: {
                        joinDataRouter.ws1!.emit("running");
                        joinDataRouter.ws2!.emit("running");
                        return;
                    }
                    case State.unknown: {
                        ws.emit("alert");
                        return;
                    }
                }
            })
        });

        this.server.listen(this.port, () => {
            console.log(`schnapsen backend started on port ${this.port}`);
        });
    }
}