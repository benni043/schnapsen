import {Card, CardColors} from "./cardEnum";
import {Socket} from "socket.io";

export type Game = {
    player1: Player;
    player2: Player | undefined;
    isPlayer1OnMove: boolean;
    state: State;
    gameEnd: boolean;
    playerLeftCount: number;
    usedCards: Card[];
    availableCards: Card[];
    atout: Card | undefined;
    onePlayFinished: number;
    hasPlayer1StartedPlayRound: boolean | undefined;
    covered: boolean;
}

export type Player = {
    name: string | undefined;
    isOnline: boolean;
    handCards: Card[];
    socketConnection: Socket | undefined;
    cardCount: number;
    activeCard: Card | undefined;
    say20: boolean;
    say40: boolean;
    wonCount: number;
    saidCards: Card[];
    said: boolean;
}

export enum State {
    joining,
    gameRunning
}

export enum ServerID {
    server1 = 1,
    server2 = 2,
    server3 = 3
}

export type NewGameData = {
    playerName: string;
    serverToConnect: ServerID;
}

export type SetCardData = {
    playerName: string;
    serverToConnect: ServerID;
    card: Card;
}

export enum Ansagen {
    ansagen20,
    ansagen40,
    normal
}

export enum PlayerEnum {
    player1,
    player2
}