import * as express from 'express';
import * as http from 'http';
import * as cors from 'cors';
import {Server} from "socket.io";
import {Game, NewGameData, ServerID, SetCardData, State} from "../../sources/game";
import {Card, CardColors, CardValues} from "../../sources/cardEnum";

const app = express();

app.use(cors());

const server = http.createServer(app);
const socketIO = new Server(server, {cors: {origin: true}});
const port = 3000;

let game: Map<ServerID, Game> = new Map();
let values: Map<CardValues, number> = new Map([[CardValues.Jack, 2], [CardValues.Queen, 3], [CardValues.King, 5], [CardValues.Ten, 10], [CardValues.Ace, 11]]);

function getAllCardCombinations(): Card[] {
    const cardCombinations: Card[] = [];

    const colors = [CardColors.club, CardColors.spade, CardColors.heart, CardColors.diamond];
    const values = [CardValues.Jack, CardValues.Queen, CardValues.King, CardValues.Ten, CardValues.Ace];

    for (const color of colors) {
        for (const value of values) {
            cardCombinations.push({cardColor: color as CardColors, cardValue: value as CardValues});
        }
    }

    return cardCombinations;
}

function getRandomCards(n: number, server: ServerID): Card[] {
    let cards: Card[] = [];

    for (let i = 0; i < n; i++) {
        let randNum = Math.floor(Math.random() * game.get(server)!.availableCards.length);

        cards.push(game.get(server)!.availableCards[randNum])
        game.get(server)!.availableCards.splice(randNum, 1);
    }

    return cards;
}

function includesSpecificCard(cards: Card[], card: Card): boolean {
    for (let card1 of cards) {
        if (card1.cardColor == card.cardColor && card1.cardValue == card.cardValue) return true;
    }

    return false;
}

function getIndexOfCard(cards: Card[], card: Card): number {
    for (let i = 0; i < cards.length; i++) {
        if (cards[i].cardColor == card.cardColor && cards[i].cardValue == card.cardValue) return i;
    }

    throw new Error();
}

function checkIfPlayer1HasWon(cardPlayer1: Card, cardPlayer2: Card, server: ServerID): boolean {
    //TODO da geht iwas nicht ka

    let actGame = game.get(server);

    if (cardPlayer1.cardColor == actGame!.atout!.cardColor && cardPlayer2.cardColor != actGame!.atout!.cardColor) return true;
    if (cardPlayer1.cardColor != actGame!.atout!.cardColor && cardPlayer2.cardColor == actGame!.atout!.cardColor) return false;

    if (game.get(server)!.isPlayer1OnMove) {
        if (cardPlayer1.cardValue < cardPlayer2.cardValue && cardPlayer1.cardColor != cardPlayer2.cardColor) return true;
        if (cardPlayer1.cardValue < cardPlayer2.cardValue && cardPlayer1.cardColor == cardPlayer2.cardColor) return false;
        if (cardPlayer1.cardValue > cardPlayer2.cardValue && cardPlayer1.cardColor == cardPlayer2.cardColor) return true;
        if (cardPlayer1.cardValue > cardPlayer2.cardValue && cardPlayer1.cardColor != cardPlayer2.cardColor) return true;
        if (cardPlayer1.cardValue == cardPlayer2.cardValue) return true;
    } else {
        if (cardPlayer1.cardValue < cardPlayer2.cardValue && cardPlayer1.cardColor != cardPlayer2.cardColor) return false;
        if (cardPlayer1.cardValue < cardPlayer2.cardValue && cardPlayer1.cardColor == cardPlayer2.cardColor) return false;
        if (cardPlayer1.cardValue > cardPlayer2.cardValue && cardPlayer1.cardColor == cardPlayer2.cardColor) return true;
        if (cardPlayer1.cardValue > cardPlayer2.cardValue && cardPlayer1.cardColor != cardPlayer2.cardColor) return false;
        if (cardPlayer1.cardValue == cardPlayer2.cardValue) return false;
    }

    throw new Error();
}

socketIO.on('connection', (ws) => {
    //TODO 20 / 40 ansagen

    let name: string = "";
    let server: ServerID = ServerID.server1;

    ws.on("newGame", (newGameData: NewGameData) => {
        if (!game.has(newGameData.serverToConnect)) {
            name = newGameData.playerName;
            server = newGameData.serverToConnect;

            game.set(newGameData.serverToConnect, {
                player1: {
                    name: newGameData.playerName,
                    isOnline: true,
                    handCards: [],
                    socketConnection: ws,
                    cardCount: 0,
                    activeCard: undefined
                },
                player2: {
                    name: undefined,
                    isOnline: false,
                    handCards: [],
                    socketConnection: undefined,
                    cardCount: 0,
                    activeCard: undefined
                },
                isPlayer1OnMove: true,
                state: State.joining,
                isPlayer1Ready: true,
                isPlayer2Ready: false,
                gameEnd: false,
                usedCards: [],
                availableCards: getAllCardCombinations(),
                atout: undefined,
                onePlayFinished: 0,
                playerLeftCount: 0
            })
        } else {
            if(game.get(newGameData.serverToConnect)!.state == State.gameRunning) {
                ws.emit("gameStartedError");
                return;
            }

            name = newGameData.playerName;
            server = newGameData.serverToConnect;

            //set atout
            game.get(newGameData.serverToConnect)!.atout = getRandomCards(1, newGameData.serverToConnect)[0];

            let cards: Card[] = getRandomCards(10, newGameData.serverToConnect);

            //fill handCards
            game.get(newGameData.serverToConnect)!.player1.handCards.push(cards[0]);
            game.get(newGameData.serverToConnect)!.player1.handCards.push(cards[1]);
            game.get(newGameData.serverToConnect)!.player1.handCards.push(cards[2]);
            game.get(newGameData.serverToConnect)!.player1.handCards.push(cards[3]);
            game.get(newGameData.serverToConnect)!.player1.handCards.push(cards[4]);

            game.get(newGameData.serverToConnect)!.player2!.handCards.push(cards[5]);
            game.get(newGameData.serverToConnect)!.player2!.handCards.push(cards[6]);
            game.get(newGameData.serverToConnect)!.player2!.handCards.push(cards[7]);
            game.get(newGameData.serverToConnect)!.player2!.handCards.push(cards[8]);
            game.get(newGameData.serverToConnect)!.player2!.handCards.push(cards[9]);

            //set undefined values of player2
            game.get(newGameData.serverToConnect)!.player2!.name = newGameData.playerName;
            game.get(newGameData.serverToConnect)!.player2!.isOnline = true;
            game.get(newGameData.serverToConnect)!.player2!.socketConnection = ws;

            //update game settings that game can start
            game.get(newGameData.serverToConnect)!.isPlayer2Ready = true;
            game.get(newGameData.serverToConnect)!.state = State.gameRunning;

            //send handCards to each playing player
            game.get(newGameData.serverToConnect)!.player1.socketConnection!.emit("postCards", game.get(newGameData.serverToConnect)!.player1.handCards as Card[]);
            game.get(newGameData.serverToConnect)!.player2!.socketConnection!.emit("postCards", game.get(newGameData.serverToConnect)!.player2!.handCards as Card[]);

            game.get(newGameData.serverToConnect)!.player1.socketConnection!.emit("postAtout", game.get(newGameData.serverToConnect)!.atout);
            game.get(newGameData.serverToConnect)!.player2!.socketConnection!.emit("postAtout", game.get(newGameData.serverToConnect)!.atout);
        }
    })

    ws.on("setCard", (setCardData: SetCardData) => {
        let actGame = game.get(setCardData.serverToConnect);

        if (actGame!.gameEnd) {
            ws.emit("gameFinishedError");
            return;
        }

        if (actGame!.isPlayer1OnMove && setCardData.playerName === actGame!.player1.name) {
            if (includesSpecificCard(actGame!.player1!.handCards, setCardData.card)) {
                actGame!.player1.activeCard = setCardData.card;

                actGame!.player1!.socketConnection!.emit("setCardSuccess", setCardData.card);

                actGame!.player1.handCards.splice(getIndexOfCard(actGame!.player1.handCards, setCardData.card), 1);

                actGame!.isPlayer1OnMove = false;
                actGame!.onePlayFinished++;

                actGame!.usedCards.push(setCardData.card)
            }
        } else if (!actGame!.isPlayer1OnMove && setCardData.playerName === actGame!.player2!.name) {
            if (includesSpecificCard(actGame!.player2!.handCards, setCardData.card)) {
                actGame!.player2!.activeCard = setCardData.card;

                actGame!.player2!.socketConnection!.emit("setCardSuccess", setCardData.card);

                actGame!.player2!.handCards.splice(getIndexOfCard(actGame!.player2!.handCards, setCardData.card), 1);

                actGame!.isPlayer1OnMove = true;
                actGame!.onePlayFinished++;

                actGame!.usedCards.push(setCardData.card)
            }
        } else {
            ws.emit("playerNotOnMoveError");
        }

        if (actGame!.onePlayFinished == 2) {
            let hasPlayer1Won = checkIfPlayer1HasWon(actGame!.player1!.activeCard!, actGame!.player2!.activeCard!, setCardData.serverToConnect);

            if (hasPlayer1Won) {
                actGame!.player1.cardCount += values.get(actGame!.player1!.activeCard!.cardValue)!
                actGame!.player1.cardCount += values.get(actGame!.player2!.activeCard!.cardValue)!;

                actGame!.player1!.socketConnection!.emit("playerMoveInformation", actGame!.player1.cardCount);

                actGame!.isPlayer1OnMove = true;
            } else {
                actGame!.player2!.cardCount += values.get(actGame!.player1!.activeCard!.cardValue)!;
                actGame!.player2!.cardCount += values.get(actGame!.player2!.activeCard!.cardValue)!;

                actGame!.player2!.socketConnection!.emit("playerMoveInformation", actGame!.player2!.cardCount);

                actGame!.isPlayer1OnMove = false;
            }

            actGame!.player1!.activeCard = undefined;
            actGame!.player2!.activeCard = undefined;

            let player1Card;
            let player2Card;

            if(hasPlayer1Won) {
                player1Card = getRandomCards(1, setCardData.serverToConnect)[0];
                player2Card = getRandomCards(1, setCardData.serverToConnect)[0];
            } else {
                player2Card = getRandomCards(1, setCardData.serverToConnect)[0];
                player1Card = getRandomCards(1, setCardData.serverToConnect)[0];
            }

            if (player1Card != undefined && player2Card != undefined) {
                actGame!.player1!.handCards.push(player1Card);
                actGame!.player2!.handCards.push(player2Card);

                actGame!.player1.socketConnection!.emit("newCard", player1Card);
                actGame!.player2!.socketConnection!.emit("newCard", player2Card);
            } else if (player1Card == undefined && player2Card != undefined && !hasPlayer1Won) {
                actGame!.player1.handCards.push(actGame!.atout!)
                actGame!.player2!.handCards.push(player2Card)

                actGame!.player1.socketConnection!.emit("newCard", actGame!.atout!);
                actGame!.player2!.socketConnection!.emit("newCard", player2Card);
            } else if (player1Card == undefined && player2Card != undefined && hasPlayer1Won) {
                actGame!.player1.handCards.push(player2Card)
                actGame!.player2!.handCards.push(actGame!.atout!)

                actGame!.player1.socketConnection!.emit("newCard", player2Card);
                actGame!.player2!.socketConnection!.emit("newCard", actGame!.atout!);
            } else if (player2Card == undefined && player1Card != undefined && !hasPlayer1Won) {
                actGame!.player1.handCards.push(player1Card)
                actGame!.player2!.handCards.push(actGame!.atout!)

                actGame!.player1.socketConnection!.emit("newCard", player1Card);
                actGame!.player2!.socketConnection!.emit("newCard", actGame!.atout!);
            } else if (player2Card == undefined && player1Card != undefined && hasPlayer1Won) {
                actGame!.player1.handCards.push(actGame!.atout!)
                actGame!.player2!.handCards.push(player1Card)

                actGame!.player1.socketConnection!.emit("newCard", actGame!.atout!);
                actGame!.player2!.socketConnection!.emit("newCard", player1Card);
            }

            actGame!.onePlayFinished = 0;

            if (actGame!.player1.cardCount >= 66) {
                actGame!.gameEnd = true;
                actGame!.player1!.socketConnection!.emit("gameEndInformation", actGame!.player1.name);
                actGame!.player2!.socketConnection!.emit("gameEndInformation", actGame!.player1.name);
            } else if (actGame!.player2!.cardCount >= 66) {
                actGame!.gameEnd = true;
                actGame!.player1!.socketConnection!.emit("gameEndInformation", actGame!.player2!.name);
                actGame!.player2!.socketConnection!.emit("gameEndInformation", actGame!.player2!.name);
            } else if (hasPlayer1Won && actGame!.usedCards.length == 20) {
                actGame!.gameEnd = true;
                actGame!.player1!.socketConnection!.emit("gameEndInformation", actGame!.player1.name);
                actGame!.player2!.socketConnection!.emit("gameEndInformation", actGame!.player1.name);
            } else if (!hasPlayer1Won && actGame!.usedCards.length == 20) {
                actGame!.gameEnd = true;
                actGame!.player1!.socketConnection!.emit("gameEndInformation", actGame!.player2!.name);
                actGame!.player2!.socketConnection!.emit("gameEndInformation", actGame!.player2!.name);
            }
        }
    })

    ws.on("disconnect", () => {
        let actGame = game.get(server);

        if (actGame != undefined) {
            actGame!.playerLeftCount++;

            if (actGame!.playerLeftCount == 2) {
                game.delete(server);
            }
        }
    })
});


server.listen(port, () => {
    console.log(`server started on port ${port}`);
});