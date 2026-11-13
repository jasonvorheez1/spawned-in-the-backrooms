// Level 31's dressed zones. Each part is one file with one export lay<Part>(ctx); this file is the only list the sim reads.
import { layArcade } from "./level31-arcade.js";
import { layFood } from "./level31-food.js";
import { layRental } from "./level31-rental.js";
import { layShop } from "./level31-shop.js";
import { laySideB } from "./level31-sideb.js";
import { layDesign } from "./level31-design.js";
import { layLoft } from "./level31-loft.js";
export function layParts(ctx) { layArcade(ctx); layFood(ctx); layRental(ctx); layShop(ctx); laySideB(ctx); layDesign(ctx); layLoft(ctx); }
