import * as express from 'express';
import * as http from 'http';
import * as cors from 'cors';
import {Server, Socket} from "socket.io";
import {Ansagen, Game, NewGameData, ServerID, SetCardData, State} from "../../sources/game";
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

function getAnsage(cards: Card[], atout: Card): Ansagen {
    const colors = [CardColors.club, CardColors.spade, CardColors.heart, CardColors.diamond];
    let hasKingAndQueenOfAtout = false;

    for (const color of colors) {
        const hasKing = cards.some(card => card.cardColor === color && card.cardValue === CardValues.King);
        const hasQueen = cards.some(card => card.cardColor === color && card.cardValue === CardValues.Queen);

        if (hasKing && hasQueen) {
            if (color === atout.cardColor && cards.some(card => card.cardColor === atout.cardColor && card.cardValue === CardValues.King)) {
                hasKingAndQueenOfAtout = cards.some(card => card.cardColor === atout.cardColor && card.cardValue === CardValues.Queen);
            } else {
                return Ansagen.ansagen20;
            }
        }
    }

    if (hasKingAndQueenOfAtout) {
        return Ansagen.ansagen40;
    } else {
        return Ansagen.normal;
    }
}

function rejoinPlayer1(actGame: Game, ws: Socket) {
    actGame!.player1.isOnline = true;
    actGame!.isPlayer1Ready = true;
    actGame!.player1.socketConnection = ws;
    actGame!.playerLeftCount--;

    actGame!.player1.socketConnection!.emit("postCards", actGame!.player1.handCards as Card[]);
    actGame!.player1.socketConnection!.emit("postAtout", actGame!.atout as Card);
    actGame!.player1.socketConnection!.emit("setCardCount", actGame!.player1.cardCount);
    actGame!.player1.socketConnection!.emit("started");

    sendAnsagePlayer1(actGame);
}

function rejoinPlayer2(actGame: Game, ws: Socket) {
    actGame!.player2!.isOnline = true;
    actGame!.isPlayer2Ready = true;
    actGame!.player2!.socketConnection = ws;
    actGame!.playerLeftCount--;

    actGame!.player2!.socketConnection!.emit("postCards", actGame!.player2!.handCards as Card[]);
    actGame!.player2!.socketConnection!.emit("postAtout", actGame!.atout as Card);
    actGame!.player2!.socketConnection!.emit("setCardCount", actGame!.player2!.cardCount);
    actGame!.player2!.socketConnection!.emit("started");

    sendAnsagePlayer2(actGame);
}

function sendAnsagePlayer1(actGame: Game) {
    let ansage = getAnsage(actGame!.player1.handCards, actGame!.atout!);

    if (ansage == Ansagen.ansagen20) {
        actGame!.player1.say20 = true;
        actGame!.player1.socketConnection!.emit("say", 20);
    } else if (ansage == Ansagen.ansagen40) {
        actGame!.player1.say40 = true;
        actGame!.player1.socketConnection!.emit("say", 40);
    } else {
        actGame!.player1.say20 = false;
        actGame!.player1.say40 = false;
        actGame!.player1.socketConnection!.emit("clearSay");
    }
}

function sendAnsagePlayer2(actGame: Game) {
    let ansage = getAnsage(actGame!.player2!.handCards, actGame!.atout!);

    if (ansage == Ansagen.ansagen20) {
        actGame!.player2!.say20 = true;
        actGame!.player2!.socketConnection!.emit("say", 20);
    } else if (ansage == Ansagen.ansagen40) {
        actGame!.player2!.say40 = true;
        actGame!.player2!.socketConnection!.emit("say", 40);
    } else {
        actGame!.player2!.say20 = false;
        actGame!.player2!.say40 = false;
        actGame!.player2!.socketConnection!.emit("clearSay");
    }
}


socketIO.on('connection', (ws) => {
    let name: string = "";
    let server: ServerID = ServerID.server1;

    ws.on("newGame", (newGameData: NewGameData) => {
        let actGame = game.get(newGameData.serverToConnect);
        name = newGameData.playerName;
        server = newGameData.serverToConnect;

        if (!game.has(newGameData.serverToConnect)) {
            ws.emit("joinSucceed")

            game.set(newGameData.serverToConnect, {
                player1: {
                    name: newGameData.playerName,
                    isOnline: true,
                    handCards: [],
                    socketConnection: ws,
                    cardCount: 0,
                    activeCard: undefined,
                    say20: false,
                    say40: false,
                    wonCount: 0,
                },
                player2: {
                    name: undefined,
                    isOnline: false,
                    handCards: [],
                    socketConnection: undefined,
                    cardCount: 0,
                    activeCard: undefined,
                    say20: false,
                    say40: false,
                    wonCount: 0,
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
                playerLeftCount: 0,
                hasPlayer1StartedPlayRound: undefined,
                covered: false,
            })
        } else {
            //rejoin
            if (actGame!.player1.name == newGameData.playerName && actGame!.state == State.gameRunning && !actGame!.player1.isOnline) {
                rejoinPlayer1(actGame!, ws);

                ws.emit("joinSucceed");
                return;
            } else if (actGame!.player2!.name == newGameData.playerName && actGame!.state == State.gameRunning && !actGame!.player2!.isOnline) {
                rejoinPlayer2(actGame!, ws);

                ws.emit("joinSucceed");
                return;
            } else if (actGame!.state == State.gameRunning) {
                ws.emit("alert", "Dieser Server wird bereits benützt!");
                return;
            }

            //name error
            if (name == game.get(server)!.player1!.name) {
                ws.emit("alert", "Dieser Name wird bereits benützt!");
                return;
            }

            //join
            //send msg to player2 that join succeeded
            ws.emit("joinSucceed");

            //set atout
            actGame!.atout = getRandomCards(1, newGameData.serverToConnect)[0];

            //get first five handcards
            let cards: Card[] = getRandomCards(10, newGameData.serverToConnect);

            //fill handCards
            actGame!.player1.handCards.push(cards[0]);
            actGame!.player1.handCards.push(cards[1]);
            actGame!.player1.handCards.push(cards[2]);
            actGame!.player1.handCards.push(cards[3]);
            actGame!.player1.handCards.push(cards[4]);

            actGame!.player2!.handCards.push(cards[5]);
            actGame!.player2!.handCards.push(cards[6]);
            actGame!.player2!.handCards.push(cards[7]);
            actGame!.player2!.handCards.push(cards[8]);
            actGame!.player2!.handCards.push(cards[9]);

            //set undefined values of player2
            actGame!.player2!.name = newGameData.playerName;
            actGame!.player2!.isOnline = true;
            actGame!.player2!.socketConnection = ws;

            //update game settings that game can start
            actGame!.isPlayer2Ready = true;
            actGame!.state = State.gameRunning;

            //activate ansage button for player
            sendAnsagePlayer1(actGame!);
            sendAnsagePlayer2(actGame!);

            //send handCards to each playing player
            actGame!.player1.socketConnection!.emit("postCards", actGame!.player1.handCards as Card[]);
            actGame!.player2!.socketConnection!.emit("postCards", actGame!.player2!.handCards as Card[]);

            //send atout to each player
            actGame!.player1.socketConnection!.emit("postAtout", actGame!.atout);
            actGame!.player2!.socketConnection!.emit("postAtout", actGame!.atout);

            //start game
            actGame!.player1!.socketConnection!.emit("started");
            actGame!.player2!.socketConnection!.emit("started");
        }
    })

    ws.on("setCard", (setCardData: SetCardData) => {
        let actGame = game.get(setCardData.serverToConnect);

        if (actGame!.gameEnd) {
            ws.emit("alert", "Das Spiel ist bereits beendet!");
            return;
        }

        if (actGame!.isPlayer1OnMove && setCardData.playerName === actGame!.player1.name) {
            if (includesSpecificCard(actGame!.player1!.handCards, setCardData.card)) {
                if (actGame!.player2!.activeCard == undefined) {
                    actGame!.hasPlayer1StartedPlayRound = true;
                }

                actGame!.player1.activeCard = setCardData.card;

                actGame!.player1!.socketConnection!.emit("setCardSuccess", setCardData.card);
                actGame!.player2!.socketConnection!.emit("setCardSuccess", setCardData.card);

                actGame!.player1.handCards.splice(getIndexOfCard(actGame!.player1.handCards, setCardData.card), 1);

                actGame!.isPlayer1OnMove = false;
                actGame!.onePlayFinished++;

                actGame!.usedCards.push(setCardData.card)
            }
        } else if (!actGame!.isPlayer1OnMove && setCardData.playerName === actGame!.player2!.name) {
            if (includesSpecificCard(actGame!.player2!.handCards, setCardData.card)) {
                if (actGame!.player1.activeCard == undefined) {
                    actGame!.hasPlayer1StartedPlayRound = false;
                }

                actGame!.player2!.activeCard = setCardData.card;

                actGame!.player1!.socketConnection!.emit("setCardSuccess", setCardData.card);
                actGame!.player2!.socketConnection!.emit("setCardSuccess", setCardData.card);

                actGame!.player2!.handCards.splice(getIndexOfCard(actGame!.player2!.handCards, setCardData.card), 1);

                actGame!.isPlayer1OnMove = true;
                actGame!.onePlayFinished++;

                actGame!.usedCards.push(setCardData.card)
            }
        } else {
            ws.emit("alert", "Du bist nicht am Zug!");
        }

        if (actGame!.onePlayFinished == 2) {
            let hasPlayer1Won = checkIfPlayer1HasWon(actGame!.player1!.activeCard!, actGame!.player2!.activeCard!, setCardData.serverToConnect);

            actGame!.hasPlayer1StartedPlayRound = undefined;

            if (hasPlayer1Won) {
                actGame!.player1.cardCount += values.get(actGame!.player1!.activeCard!.cardValue)!
                actGame!.player1.cardCount += values.get(actGame!.player2!.activeCard!.cardValue)!;

                actGame!.player1!.socketConnection!.emit("setCardCount", actGame!.player1.cardCount);

                actGame!.isPlayer1OnMove = true;
            } else {
                actGame!.player2!.cardCount += values.get(actGame!.player1!.activeCard!.cardValue)!;
                actGame!.player2!.cardCount += values.get(actGame!.player2!.activeCard!.cardValue)!;

                actGame!.player2!.socketConnection!.emit("setCardCount", actGame!.player2!.cardCount);

                actGame!.isPlayer1OnMove = false;
            }

            actGame!.player1!.socketConnection!.emit("clearCurrCard");
            actGame!.player2!.socketConnection!.emit("clearCurrCard");

            actGame!.player1!.activeCard = undefined;
            actGame!.player2!.activeCard = undefined;

            let player1Card;
            let player2Card;

            if (!actGame!.covered) {
                if (actGame!.availableCards.length > 1) {
                    if (hasPlayer1Won) {
                        player1Card = getRandomCards(1, setCardData.serverToConnect)[0];
                        player2Card = getRandomCards(1, setCardData.serverToConnect)[0];
                    } else {
                        player2Card = getRandomCards(1, setCardData.serverToConnect)[0];
                        player1Card = getRandomCards(1, setCardData.serverToConnect)[0];
                    }
                } else {
                    if (hasPlayer1Won) {
                        player1Card = getRandomCards(1, setCardData.serverToConnect)[0];
                        player2Card = actGame!.atout;
                    } else {
                        player1Card = actGame!.atout;
                        player2Card = getRandomCards(1, setCardData.serverToConnect)[0];
                    }
                }
            }

            if (player1Card != undefined && player2Card != undefined) {
                actGame!.player1!.handCards.push(player1Card);
                actGame!.player2!.handCards.push(player2Card);

                actGame!.player1.socketConnection!.emit("newCard", player1Card);
                actGame!.player2!.socketConnection!.emit("newCard", player2Card);
            }

            sendAnsagePlayer1(actGame!);
            sendAnsagePlayer2(actGame!);

            actGame!.onePlayFinished = 0;

            if (actGame!.player1.cardCount >= 166) {
                actGame!.gameEnd = true;
                actGame!.player1!.socketConnection!.emit("gameEndInformation", actGame!.player1.name);
                actGame!.player2!.socketConnection!.emit("gameEndInformation", actGame!.player1.name);
            } else if (actGame!.player2!.cardCount >= 166) {
                actGame!.gameEnd = true;
                actGame!.player1!.socketConnection!.emit("gameEndInformation", actGame!.player2!.name);
                actGame!.player2!.socketConnection!.emit("gameEndInformation", actGame!.player2!.name);
            } else if (hasPlayer1Won && (actGame!.usedCards.length == 20 || (actGame!.player1.handCards.length == 0 && actGame!.covered))) {
                actGame!.gameEnd = true;
                actGame!.player1!.socketConnection!.emit("gameEndInformation", actGame!.player1.name);
                actGame!.player2!.socketConnection!.emit("gameEndInformation", actGame!.player1.name);
            } else if (!hasPlayer1Won && (actGame!.usedCards.length == 20 || (actGame!.player2!.handCards.length == 0 && actGame!.covered))) {
                actGame!.gameEnd = true;
                actGame!.player1!.socketConnection!.emit("gameEndInformation", actGame!.player2!.name);
                actGame!.player2!.socketConnection!.emit("gameEndInformation", actGame!.player2!.name);
            }
        }
    })

    ws.on("disconnect", () => {
        let actGame = game.get(server);

        if (actGame) {
            actGame.playerLeftCount++;

            if (name == actGame.player1.name) {
                actGame.player1.isOnline = false;
                actGame.isPlayer1Ready = false;
            } else if (name == actGame.player2!.name) {
                actGame.player2!.isOnline = false;
                actGame.isPlayer2Ready = false;
            }

            if (actGame.state == State.joining || actGame.playerLeftCount == 2) {
                game.delete(server);
            }
        }
    })

    ws.on("sendSay", (data) => {
        let actGame = game.get(data.serverToConnect);

        if (actGame!.gameEnd) {
            ws.emit("alert", "Das Spiel ist bereits beendet!");
            return;
        }

        let player = actGame!.isPlayer1OnMove ? actGame!.player1 : actGame!.player2!;
        let opponent = actGame!.isPlayer1OnMove ? actGame!.player2 : actGame!.player1;

        if (player.name !== data.playerName) {
            ws.emit("alert", "Du bist nicht am Zug!");
            return;
        }

        if (actGame!.hasPlayer1StartedPlayRound !== undefined) {
            ws.emit("alert", "Du kannst gerade nichts ansagen, da dein Gegner den Spielzug gestartet hat!");
            return;
        }

        if (player.say20) {
            player.cardCount += 20;
            player.socketConnection!.emit("setCardCount", player.cardCount);
            player.say20 = false;
            player.say40 = false;
            ws.emit("clearSay");
        } else if (player.say40) {
            player.cardCount += 40;
            player.socketConnection!.emit("setCardCount", player.cardCount);
            player.say20 = false;
            player.say40 = false;
            ws.emit("clearSay");
        }
    });

    ws.on("sendCover", (newGameData: NewGameData) => {
        //TODO wenn covered oder nur nur atout und eine karte kann nur noch 20 angesagt werden.

        let actGame = game.get(newGameData.serverToConnect);
        if (actGame!.covered) return;

        if (actGame!.player1.name == newGameData.playerName && actGame!.isPlayer1OnMove || actGame!.player2!.name == newGameData.playerName && !actGame!.isPlayer1OnMove) {
            actGame!.covered = true;
        }
    })
});


server.listen(port, () => {
    console.log(`server started on port ${port}`);
});