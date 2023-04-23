import {Game, GameState, PlayerEnum, State, UserData} from "../../../sources/utils";

export class StoreSchnapsen {

    game: Map<number, Game> = new Map();

    joinFirstPlayer(joinData: UserData) {
        this.game.set(joinData.server, {
            player1: {
                name: joinData.player,
                activeCard: undefined,
                announce20: false,
                announce40: false,
                handCards: [],
                socketConnection: joinData.ws,
                points: 0,
                isOnline: true,
            },
            player2: {
                name: undefined,
                activeCard: undefined,
                announce20: false,
                announce40: false,
                handCards: [],
                socketConnection: undefined,
                points: 0,
                isOnline: false,
            },
            state: State.joining,
            atout: undefined,
            covered: false,
            isPlayer1OnMove: true,
            availableCards: [],
            playerLeftCount: 0,
        });
    }

    joinSecondPlayer(joinData: UserData) {
        this.game.get(joinData.server)!.player2.name = joinData.player;
        this.game.get(joinData.server)!.player2.socketConnection = joinData.ws;
        this.game.get(joinData.server)!.player2.isOnline = true;

        this.game.get(joinData.server)!.state = State.running;

        this.start();
    }

    start() {

    }

    getGameState(server: number): GameState {
        if (this.game.get(server) == undefined) {
            return GameState.playerRemain2;
        } else if (this.game.get(server)!.state == State.joining) {
            return GameState.playerRemain1;
        } else {
            return GameState.playerRemain0;
        }
    }

    getWsOfPlayer(player: PlayerEnum, server: number) {
        if (player == PlayerEnum.player1) {
            return this.game.get(server)!.player1.socketConnection;
        } else {
            return this.game.get(server)!.player2.socketConnection;
        }
    }

}