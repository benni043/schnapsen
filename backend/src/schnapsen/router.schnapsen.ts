import * as express from 'express';
import * as http from 'http';
import * as cors from 'cors';
import {Server} from "socket.io";
import {Join, State, UserData} from "../../../sources/utils";
import {ServiceSchnapsen} from "./service.schnapsen";

const app = express();

app.use(cors());

const server = http.createServer(app);
const socketIO = new Server(server, {cors: {origin: true}});
const port = 3000;

socketIO.on('connection', (ws) => {
    ws.on("join", (joinData: UserData) => {
        let joinDataRouter: Join = router.join(joinData);

        switch (joinDataRouter.state) {
            case State.joining: {
                joinDataRouter.ws1!.emit("joining");
            }
            case State.running: {
                joinDataRouter.ws1!.emit("running");
                joinDataRouter.ws2!.emit("running");
            }
            case State.unknown: {
                ws.emit("alert");
            }
        }
    })
});
server.listen(port, () => {
    console.log(`schnapsen backend started on port ${port}`);
});

export class RouterSchnapsen {
    serviceSchnapsen: ServiceSchnapsen = new ServiceSchnapsen();

    join(joinData: UserData): Join {
        return this.serviceSchnapsen.join(joinData);
    }
}

let router = new RouterSchnapsen();