export enum CardColors {
    heart,
    diamond,
    spade,
    club
}

export enum CardValues {
    Ten,
    Jack,
    Queen,
    King,
    Ace
}

export type Card = {
    cardColor: CardColors;
    cardValue: CardValues;
}