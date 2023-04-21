import * as express from 'express';
import * as http from 'http';
import * as cors from 'cors';
import {Server, Socket} from "socket.io";
import {Ansagen, Game, NewGameData, PlayerEnum, ServerID, SetCardData, State} from "../../sources/game";
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

function getWinner3(player1Card: Card, player2Card: Card, trumpSuit: CardColors, hasPlayer1Started: boolean): PlayerEnum {
    const cardValue = {
        [CardValues.Ace]: 11,
        [CardValues.King]: 5,
        [CardValues.Queen]: 3,
        [CardValues.Jack]: 2,
        [CardValues.Ten]: 10
    };

    const isTrump = (card: Card) => card.cardColor === trumpSuit;

    const player1CardIsTrump = isTrump(player1Card);
    const player2CardIsTrump = isTrump(player2Card);

    if (player1CardIsTrump && !player2CardIsTrump) {
        return PlayerEnum.player1;
    } else if (!player1CardIsTrump && player2CardIsTrump) {
        return PlayerEnum.player2;
    } else if (player1CardIsTrump && player2CardIsTrump) {
        return cardValue[player1Card.cardValue] > cardValue[player2Card.cardValue] ? PlayerEnum.player1 : PlayerEnum.player2;
    } else {
        if (player1Card.cardColor === player2Card.cardColor) {
            return cardValue[player1Card.cardValue] > cardValue[player2Card.cardValue] ? PlayerEnum.player1 : PlayerEnum.player2;
        } else {
            return hasPlayer1Started ? PlayerEnum.player1 : PlayerEnum.player2;
        }
    }
}

function getAnsage(cards: Card[], atout: Card, actGame: Game): { ansagen: Ansagen, cards: Card[] } {
    const colors = [CardColors.club, CardColors.spade, CardColors.heart, CardColors.diamond];
    let hasKingAndQueenOfAtout = false;
    let king;
    let queen;

    for (const color of colors) {
        const hasKing = cards.some(card => card.cardColor === color && card.cardValue === CardValues.King);
        king = cards.filter(card => card.cardColor === color && card.cardValue === CardValues.King)[0];
        const hasQueen = cards.some(card => card.cardColor === color && card.cardValue === CardValues.Queen);
        queen = cards.filter(card => card.cardColor === color && card.cardValue === CardValues.Queen)[0];

        if (hasKing && hasQueen) {
            if (color === atout.cardColor && cards.some(card => card.cardColor === atout.cardColor && card.cardValue === CardValues.King)) {
                hasKingAndQueenOfAtout = cards.some(card => card.cardColor === atout.cardColor && card.cardValue === CardValues.Queen);
            } else {
                return {
                    ansagen: Ansagen.ansagen20,
                    cards: [{cardColor: king.cardColor, cardValue: CardValues.King}, {
                        cardColor: queen.cardColor,
                        cardValue: CardValues.Queen
                    }]
                };
            }
        }
    }

    if (hasKingAndQueenOfAtout && !actGame.covered || hasKingAndQueenOfAtout && (actGame.availableCards.length > 1)) {
        return {
            ansagen: Ansagen.ansagen40,
            cards: [{cardColor: atout.cardColor, cardValue: CardValues.King}, {
                cardColor: atout.cardColor,
                cardValue: CardValues.Queen
            }]
        };
    } else if (hasKingAndQueenOfAtout && actGame.covered || hasKingAndQueenOfAtout && !(actGame.availableCards.length > 1)) {
        if (queen != undefined && king != undefined) {
            return {
                ansagen: Ansagen.ansagen20,
                cards: [{cardColor: king.cardColor, cardValue: CardValues.King}, {
                    cardColor: queen.cardColor,
                    cardValue: CardValues.Queen
                }]
            };
        } else {
            console.log("alarm!?!?!?!?")
            return {ansagen: Ansagen.normal, cards: []};
        }
    } else {
        return {ansagen: Ansagen.normal, cards: []};
    }
}

function rejoin(actGame: Game, ws: Socket, playerEnum: PlayerEnum) {
    let player = playerEnum == PlayerEnum.player1 ? actGame.player1! : actGame.player2!;

    player.isOnline = true;
    player.socketConnection = ws;
    actGame!.playerLeftCount--;

    player.socketConnection!.emit("postCards", player.handCards as Card[]);
    player.socketConnection!.emit("postAtout", actGame!.atout as Card);
    player.socketConnection!.emit("setCardCount", player.cardCount);
    player.socketConnection!.emit("started");

    if(actGame!.player1.activeCard != undefined) {
        player.socketConnection.emit("setCurrCard", actGame!.player1.activeCard);
    } else if (actGame!.player2!.activeCard != undefined) {
        player.socketConnection.emit("setCurrCard", actGame!.player2!.activeCard);
    }

    playerEnum == PlayerEnum.player1 ? player.socketConnection!.emit("opponent", actGame!.player2!.name) : player.socketConnection!.emit("opponent", actGame!.player1.name);

    if (player.say20 && player.say40) playerEnum == PlayerEnum.player1 ? sendAnsage(actGame, PlayerEnum.player1) : sendAnsage(actGame, PlayerEnum.player2);
}

function sendAnsage(actGame: Game, playerEnum: PlayerEnum) {
    let player = playerEnum == PlayerEnum.player1 ? actGame.player1! : actGame.player2!;

    let ansage = getAnsage(player.handCards, actGame!.atout!, actGame);

    if (ansage.ansagen == Ansagen.ansagen20) {
        player.say20 = true;
        player.saidCards = ansage.cards;
        player.socketConnection!.emit("say", 20);
    } else if (ansage.ansagen == Ansagen.ansagen40) {
        player.say40 = true;
        player.saidCards = ansage.cards;
        player.socketConnection!.emit("say", 40);
    } else {
        player.say20 = false;
        player.say40 = false;
        player.saidCards = [];
        player.socketConnection!.emit("clearSay");
    }
}

function gameEndPoints(actGame: Game) {
    if (actGame!.player1.cardCount >= 66) {
        actGame!.gameEnd = true;
        actGame!.player1!.socketConnection!.emit("gameEndInformation", actGame!.player1.name);
        actGame!.player2!.socketConnection!.emit("gameEndInformation", actGame!.player1.name);
        actGame!.player1.socketConnection!.emit("clearSay");
        actGame!.player1.socketConnection!.emit("clearSay");
        return;
    }

    if (actGame!.player2!.cardCount >= 66) {
        actGame!.gameEnd = true;
        actGame!.player1!.socketConnection!.emit("gameEndInformation", actGame!.player2!.name);
        actGame!.player2!.socketConnection!.emit("gameEndInformation", actGame!.player2!.name);
        actGame!.player2!.socketConnection!.emit("clearSay");
        actGame!.player2!.socketConnection!.emit("clearSay");
        return;
    }
}

function gameEnd(actGame: Game, winner: PlayerEnum) {
    gameEndPoints(actGame);

    if (winner == PlayerEnum.player1 && (actGame!.usedCards.length == 20 || (actGame!.player1.handCards.length == 0 && actGame!.covered))) {
        actGame!.gameEnd = true;
        actGame!.player1!.socketConnection!.emit("gameEndInformation", actGame!.player1.name);
        actGame!.player2!.socketConnection!.emit("gameEndInformation", actGame!.player1.name);
        return;
    }

    if (!(winner == PlayerEnum.player1) && (actGame!.usedCards.length == 20 || (actGame!.player2!.handCards.length == 0 && actGame!.covered))) {
        actGame!.gameEnd = true;
        actGame!.player1!.socketConnection!.emit("gameEndInformation", actGame!.player2!.name);
        actGame!.player2!.socketConnection!.emit("gameEndInformation", actGame!.player2!.name);
        return;
    }
}

function checkIfPlayerCanChangeAtout(cards: Card[], atout: Card, actGame: Game): boolean {
    let changeCard = {cardValue: CardValues.Jack, cardColor: atout.cardColor} as Card;

    for (let card of cards) {
        if (card.cardValue == changeCard.cardValue && card.cardColor == changeCard.cardColor) {
            return actGame!.availableCards.length > 1;
        }
    }
    return false;
}

function checkIfCardsContainsColor(cards: Card[], color: CardColors): boolean {
    for (let card of cards) {
        if (card.cardColor == color) return true;
    }
    return false;
}

function setActiveCard(actGame: Game, playerEnum: PlayerEnum, card: Card, wss: Socket) {
    let player = playerEnum == PlayerEnum.player1 ? actGame!.player1 : actGame!.player2!;
    let opponent = playerEnum != PlayerEnum.player1 ? actGame!.player1 : actGame!.player2!;

    console.log("l1")

    player.activeCard = card;

    player.socketConnection!.emit("setCardSuccess", card);
    opponent.socketConnection!.emit("setCardSuccess", card);

    console.log("l2")

    player.handCards.splice(getIndexOfCard(player.handCards, card), 1);

    playerEnum == PlayerEnum.player1 ? actGame!.isPlayer1OnMove = false : actGame!.isPlayer1OnMove = true;

    actGame!.onePlayFinished++;

    console.log("l3")

    actGame!.usedCards.push(card)

    player.say20 = false;
    player.say40 = false;
    wss.emit("clearSay");
    console.log("l4")
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
                    saidCards: [],
                    said: false
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
                    saidCards: [],
                    said: false
                },
                isPlayer1OnMove: true,
                state: State.joining,
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
                rejoin(actGame!, ws, PlayerEnum.player1);
                if (checkIfPlayerCanChangeAtout(actGame!.player1.handCards, actGame!.atout!, actGame!)) ws.emit("swapAtoutAble");

                ws.emit("joinSucceed");
                return;
            } else if (actGame!.player2!.name == newGameData.playerName && actGame!.state == State.gameRunning && !actGame!.player2!.isOnline) {
                rejoin(actGame!, ws, PlayerEnum.player2);
                if (checkIfPlayerCanChangeAtout(actGame!.player2!.handCards, actGame!.atout!, actGame!)) ws.emit("swapAtoutAble");

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

            actGame!.player1.socketConnection!.emit("opponent", actGame!.player2!.name);
            actGame!.player2!.socketConnection!.emit("opponent", actGame!.player1.name);

            //update game settings that game can start
            actGame!.state = State.gameRunning;

            if (checkIfPlayerCanChangeAtout(actGame!.player1.handCards, actGame!.atout!, actGame!)) actGame!.player1.socketConnection!.emit("swapAtoutAble");
            if (checkIfPlayerCanChangeAtout(actGame!.player2!.handCards, actGame!.atout!, actGame!)) actGame!.player2!.socketConnection!.emit("swapAtoutAble");

            //activate ansage button for player
            sendAnsage(actGame!, PlayerEnum.player1);
            sendAnsage(actGame!, PlayerEnum.player2);

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
                if (actGame!.player1.saidCards.length != 0 && actGame!.player1.said) {
                    if (setCardData.card.cardValue != CardValues.Queen && setCardData.card.cardValue != CardValues.King) {
                        ws.emit("alert", "Du muss König oder Dame spielen!");
                        return;
                    } else {
                        for (let saidCard of actGame!.player1.saidCards) {
                            if (saidCard.cardColor == setCardData.card.cardColor) {
                                setActiveCard(actGame!, PlayerEnum.player1, setCardData.card, ws);
                                actGame!.hasPlayer1StartedPlayRound = true;
                                actGame!.player1.saidCards = [];
                                actGame!.player1.said = false;
                                return;
                            }
                        }
                        ws.emit("alert", "Du muss König oder Dame spielen!");
                        return;
                    }
                } else {
                    if (actGame!.player2!.activeCard == undefined) {
                        console.log("player1" + " " + 0)
                        setActiveCard(actGame!, PlayerEnum.player1, setCardData.card, ws);
                        actGame!.hasPlayer1StartedPlayRound = true;
                    } else {
                        console.log("player1" + " " + 1)
                        if (actGame!.availableCards.length < 1 || actGame!.covered) {
                            console.log("player1" + " " + 2)
                            let player2ActiveCardColor = actGame!.player2!.activeCard.cardColor;

                            let bool = checkIfCardsContainsColor(actGame!.player1.handCards, player2ActiveCardColor);

                            if (bool) {
                                console.log("player1" + " " + 3)
                                if (setCardData.card.cardColor != player2ActiveCardColor) {
                                    console.log("player1" + " " + 4)
                                    ws.emit("alert", "Du musst Farbe bekennen!");
                                    return;
                                } else {
                                    console.log("player1" + " " + 5)
                                    setActiveCard(actGame!, PlayerEnum.player1, setCardData.card, ws);
                                }
                            } else {
                                let atoutBool = checkIfCardsContainsColor(actGame!.player1.handCards, actGame!.atout!.cardColor);

                                if (atoutBool) {
                                    if (setCardData.card.cardColor != actGame!.atout!.cardColor) {
                                        console.log("player1" + " " + 4)
                                        ws.emit("alert", "Du musst Atout legen!");
                                        return;
                                    } else {
                                        console.log("player1" + " " + 5)
                                        setActiveCard(actGame!, PlayerEnum.player1, setCardData.card, ws);
                                    }
                                } else {
                                    setActiveCard(actGame!, PlayerEnum.player1, setCardData.card, ws);
                                }
                                console.log("player1" + " " + 6)
                            }
                        } else {
                            console.log("player1" + " " + 7)
                            setActiveCard(actGame!, PlayerEnum.player1, setCardData.card, ws);
                        }
                    }
                }
            }
        } else if (!actGame!.isPlayer1OnMove && setCardData.playerName === actGame!.player2!.name) {
            if (includesSpecificCard(actGame!.player2!.handCards, setCardData.card)) {
                if (actGame!.player2!.saidCards.length != 0 && actGame!.player2!.said) {
                    if (setCardData.card.cardValue != CardValues.Queen && setCardData.card.cardValue != CardValues.King) {
                        ws.emit("alert", "Du muss König oder Dame spielen!");
                        return;
                    } else {
                        for (let saidCard of actGame!.player2!.saidCards) {
                            if (saidCard.cardColor == setCardData.card.cardColor) {
                                setActiveCard(actGame!, PlayerEnum.player2, setCardData.card, ws);
                                actGame!.player2!.saidCards = [];
                                actGame!.player2!.said = false;
                                actGame!.hasPlayer1StartedPlayRound = false;
                                return;
                            }
                        }
                        ws.emit("alert", "Du muss König oder Dame spielen!");
                        return;
                    }
                } else {
                    if (actGame!.player1.activeCard == undefined) {
                        console.log("player2" + " " + 0)
                        setActiveCard(actGame!, PlayerEnum.player2, setCardData.card, ws);
                        actGame!.hasPlayer1StartedPlayRound = false;
                    } else {
                        console.log("player2" + " " + 1)
                        if (actGame!.availableCards.length < 1 || actGame!.covered) {
                            console.log("player2" + " " + 2)
                            let player1ActiveCardColor = actGame!.player1.activeCard.cardColor;

                            let bool = checkIfCardsContainsColor(actGame!.player2!.handCards, player1ActiveCardColor);

                            if (bool) {
                                console.log("player2" + " " + 3)
                                if (setCardData.card.cardColor != player1ActiveCardColor) {
                                    console.log("player2" + " " + 4)
                                    ws.emit("alert", "Du musst Farbe bekennen!");
                                    return;
                                } else {
                                    console.log("player2" + " " + 5)
                                    setActiveCard(actGame!, PlayerEnum.player2, setCardData.card, ws);
                                }
                            } else {
                                let atoutBool = checkIfCardsContainsColor(actGame!.player2!.handCards, actGame!.atout!.cardColor);

                                if (atoutBool) {
                                    if (setCardData.card.cardColor != actGame!.atout!.cardColor) {
                                        console.log("player2" + " " + 4)
                                        ws.emit("alert", "Du musst Atout legen!");
                                        return;
                                    } else {
                                        console.log("player2" + " " + 5)
                                        setActiveCard(actGame!, PlayerEnum.player2, setCardData.card, ws);
                                    }
                                } else {
                                    setActiveCard(actGame!, PlayerEnum.player2, setCardData.card, ws);
                                }
                                console.log("player2" + " " + 6)
                            }
                        } else {
                            console.log("player2" + " " + 7)
                            setActiveCard(actGame!, PlayerEnum.player2, setCardData.card, ws);
                        }
                    }
                }
            }
        } else {
            ws.emit("alert", "Du bist nicht am Zug!");
        }

        if (actGame!.onePlayFinished == 2) {
            let winner = getWinner3(actGame!.player1.activeCard!, actGame!.player2!.activeCard!, actGame!.atout!.cardColor, actGame!.hasPlayer1StartedPlayRound!);

            console.log(winner)

            actGame!.hasPlayer1StartedPlayRound = undefined;

            if (winner == PlayerEnum.player1) {
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
                    if (winner == PlayerEnum.player1) {
                        player1Card = getRandomCards(1, setCardData.serverToConnect)[0];
                        player2Card = getRandomCards(1, setCardData.serverToConnect)[0];
                    } else {
                        player2Card = getRandomCards(1, setCardData.serverToConnect)[0];
                        player1Card = getRandomCards(1, setCardData.serverToConnect)[0];
                    }
                } else {
                    if (winner == PlayerEnum.player1) {
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

                if (checkIfPlayerCanChangeAtout(actGame!.player1.handCards, actGame!.atout!, actGame!)) actGame!.player1.socketConnection!.emit("swapAtoutAble");
                if (checkIfPlayerCanChangeAtout(actGame!.player2!.handCards, actGame!.atout!, actGame!)) actGame!.player2!.socketConnection!.emit("swapAtoutAble");
            }

            sendAnsage(actGame!, PlayerEnum.player1);
            sendAnsage(actGame!, PlayerEnum.player2);

            actGame!.onePlayFinished = 0;

            gameEnd(actGame!, winner);

            winner == PlayerEnum.player1 ? actGame!.player1.socketConnection!.emit("alert", "Du bist dran!") : actGame!.player2!.socketConnection!.emit("alert", "Du bist dran!");
        }
    })

    ws.on("disconnect", () => {
        let actGame = game.get(server);

        if (actGame) {
            actGame.playerLeftCount++;

            if (name == actGame.player1.name) {
                actGame.player1.isOnline = false;
            } else if (name == actGame.player2!.name) {
                actGame.player2!.isOnline = false;
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
        let opponent = actGame!.isPlayer1OnMove ? actGame!.player2! : actGame!.player1;

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
            player.said = true;
            ws.emit("clearSay");
            opponent.socketConnection!.emit("said", 20);
            gameEndPoints(actGame!);
        } else if (player.say40 && !actGame!.covered) {
            player.cardCount += 40;
            player.socketConnection!.emit("setCardCount", player.cardCount);
            player.say20 = false;
            player.say40 = false;
            player.said = true;
            ws.emit("clearSay");
            opponent.socketConnection!.emit("said", 40);
            gameEndPoints(actGame!);
        }
    });

    ws.on("sendCover", (newGameData: NewGameData) => {
        let actGame = game.get(newGameData.serverToConnect);
        if (actGame!.covered) return;

        if (actGame!.player1.name == newGameData.playerName && actGame!.hasPlayer1StartedPlayRound || actGame!.player2!.name == newGameData.playerName && !actGame!.hasPlayer1StartedPlayRound) {
            actGame!.covered = true;
            actGame!.player1.socketConnection!.emit("alert", "Es wurde zugedeckt!");
            actGame!.player2!.socketConnection!.emit("alert", "Es wurde zugedeckt!");
        }
    })

    ws.on("swap", (newGameData: NewGameData) => {
        let actGame = game.get(newGameData.serverToConnect);
        let atout = actGame!.atout!;
        let changeCard = {cardValue: CardValues.Jack, cardColor: atout.cardColor} as Card;

        if(actGame!.covered) {
            ws.emit("alert", "Du kannst nicht austuaschen wenn bereits zugedeckt wurde!")
            return;
        }

        if (actGame!.player1.name == newGameData.playerName && actGame!.isPlayer1OnMove && actGame!.hasPlayer1StartedPlayRound == undefined) {
            if (includesSpecificCard(actGame!.player1!.handCards, changeCard)) {
                actGame!.player1.handCards.push(atout);
                actGame!.player1.handCards.splice(getIndexOfCard(actGame!.player1.handCards, changeCard), 1);
                actGame!.atout = changeCard;

                actGame!.player1.socketConnection!.emit("postCards", actGame!.player1.handCards);

                actGame!.player1.socketConnection!.emit("swappedAtout", actGame!.atout);
                actGame!.player2!.socketConnection!.emit("swappedAtout", actGame!.atout);

                sendAnsage(actGame!, PlayerEnum.player1);
            }
        } else if (actGame!.player2!.name == newGameData.playerName && !actGame!.isPlayer1OnMove && actGame!.hasPlayer1StartedPlayRound == undefined) {
            if (includesSpecificCard(actGame!.player2!.handCards, changeCard)) {
                actGame!.player2!.handCards.push(atout);
                actGame!.player2!.handCards.splice(getIndexOfCard(actGame!.player2!.handCards, changeCard), 1);
                actGame!.atout = changeCard;

                actGame!.player2!.socketConnection!.emit("postCards", actGame!.player2!.handCards);

                actGame!.player1.socketConnection!.emit("swappedAtout", actGame!.atout);
                actGame!.player2!.socketConnection!.emit("swappedAtout", actGame!.atout);

                sendAnsage(actGame!, PlayerEnum.player2);
            }
        } else {
            ws.emit("alert", "Du bist nicht am Zug!");
        }
    })
});


server.listen(port, () => {
    console.log(`schnapsen backend started on port ${port}`);
});