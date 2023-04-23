import {Socket} from "socket.io";
import {Card} from "./cardEnum";

export type UserData = {
    player: string;
    server: number;
    ws: Socket;
}

export type Player = {
    name: string | undefined;
    socketConnection: Socket | undefined;
    activeCard: Card | undefined;
    handCards: Card[];
    points: number;
    isOnline: boolean;
    announce20: boolean;
    announce40: boolean;
}

export type Game = {
    player1: Player;
    player2: Player;
    state: State;
    availableCards: Card[];
    atout: Card | undefined;
    covered: boolean;
    isPlayer1OnMove: boolean;
    playerLeftCount: number;
}

export enum State {
    joining,
    running,
    finished,
    unknown,
}

export enum GameState {
    playerRemain2,
    playerRemain1,
    playerRemain0,
}

export enum PlayerEnum {
    player1,
    player2,
}

export type Join = {
    state: State,
    ws1: Socket | undefined,
    ws2: Socket | undefined,
}