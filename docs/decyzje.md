# Decyzje projektowe

Każda decyzja ma zapisane, gdzie w kodzie ją zmienić.

## Łatwe do zmiany

| Decyzja | Teraz | Jak zmienić |
|---|---|---|
| Język | polski | Nowy plik w `src/i18n/` z kształtem `Messages`, wpis w `src/i18n/index.ts`, `language`/`speechLocale` w `src/config.ts`. Wikipedia, Nominatim i prompt biorą język z konfiguracji. |
| Głos | wbudowany w telefon (Web Speech API) | Nowa klasa implementująca `SpeechProvider` (`src/services/speech/types.ts`), podmiana w `src/services/speech/index.ts`. Płatny TTS powinien iść przez serwer (klucz). |
| Narrator | Claude, z zapasowym składaniem fragmentów | Nowa klasa `StoryProvider` w `src/services/story/`, kolejność w `index.ts`. Model i prompt: `server/storyHandler.ts`. |
| Personalizacja | brak | Dodać pola do `StoryRequest` (`src/shared/storyApi.ts`) i uwzględnić je w prompcie. |
| Promień, liczba miejsc | 1 km, 10 miejsc | `src/config.ts`. |
| Tryb | „opowiedz o miejscu, gdzie stoję” | Tryb spaceru/trasy to nowy przepływ obok `useGuide.ts` (np. `watchPosition`). |

## Trudne do zmiany (ustalone)

1. **Platforma: React + TypeScript jako PWA.** Później można opakować w aplikację natywną (Capacitor) bez przepisywania. Pełne prowadzenie przy zablokowanym ekranie wymaga aplikacji natywnej.
2. **Konta: brak na start.** Gdy pojawią się logowanie, historia czy ulubione, dodajemy bazę i system kont (np. Supabase) — raz, świadomie.
3. **Opowieści generowane na żywo.** Kontrakt `StoryRequest → Story` pozwala dołożyć pamięć podręczną (gotowe opowieści per miejsce i język) jako kolejny `StoryProvider`, gdy ruch i koszty urosną.
4. **Licencja treści.** Wikipedia jest na CC BY-SA: zawsze pokazujemy źródła i licencję; opowieści oparte na Wikipedii traktujemy jako udostępniane na tej samej licencji.
5. **Prywatność.** Lokalizacja nie jest zapisywana. Współrzędne trafiają tylko do Nominatim i Wikipedii; model AI dostaje nazwy miejsc i artykuły, bez współrzędnych. Zapisywanie historii miejsc wymagałoby zgód i polityki prywatności (RODO).
6. **Hosting: Vercel.** Frontend statyczny + funkcja `api/story.ts`. Logika serwera jest w `server/` jako zwykła funkcja `Request → Response`, więc przeniesienie na inny hosting to nowy cienki adapter.

## Znane ograniczenia prototypu

- Publiczny Nominatim ma limit 1 zapytania/s; przy większym ruchu potrzebny płatny dostawca lub własna instancja.
- Jakość głosu zależy od telefonu (iOS ma zwykle lepsze polskie głosy niż Android).
- Na iPhonie odtwarzanie i lokalizacja zatrzymują się po zablokowaniu ekranu.
