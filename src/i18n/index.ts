import { config } from "../config";
import { pl, type Messages } from "./pl";

// Nowy język = nowy plik obok pl.ts z tym samym kształtem (typ Messages) i wpis tutaj.
const catalogs: Record<string, Messages> = { pl };

export const t: Messages = catalogs[config.language] ?? pl;
