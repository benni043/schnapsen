import {StoreSchnapsen} from "./store.schnapsen";
import {GameState, Join, PlayerEnum, State, UserData} from "../../../sources/utils";

export class ServiceSchnapsen {

    storeSchnapsen: StoreSchnapsen = new StoreSchnapsen();

    join(joinData: UserData): Join {
        if (this.storeSchnapsen.getGameState(joinData.server) == GameState.playerRemain2) {
            this.storeSchnapsen.joinFirstPlayer(joinData);
            return {
                state: State.joining,
                ws1: this.storeSchnapsen.getWsOfPlayer(PlayerEnum.player1, joinData.server),
                ws2: undefined,
            };
        } else if (this.storeSchnapsen.getGameState(joinData.server) == GameState.playerRemain1) {
            this.storeSchnapsen.joinSecondPlayer(joinData);
            return {
                state: State.joining,
                ws1: this.storeSchnapsen.getWsOfPlayer(PlayerEnum.player1, joinData.server),
                ws2: this.storeSchnapsen.getWsOfPlayer(PlayerEnum.player2, joinData.server),
            };
        } else {
            return {
                state: State.unknown,
                ws1: undefined,
                ws2: undefined,
            };
        }
    }

}