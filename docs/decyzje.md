# Decyzje projektowe

Każda decyzja ma zapisane, gdzie w kodzie ją zmienić.

## Łatwe do zmiany

| Decyzja | Teraz | Jak zmienić |
|---|---|---|
| Język | polski | Nowy plik w `src/i18n/` z kształtem `Messages`, wpis w `src/i18n/index.ts`, `language`/`speechLocale` w `src/config.ts`. Wikipedia, Nominatim i prompt biorą język z konfiguracji. |
| Głos | Piper (open source) działający w telefonie: model neuronowy pobierany raz (~63 MB) z Hugging Face, synteza w Web Workerze; głosy telefonu (Web Speech API) jako wybór ręczny i zapas, gdy Piper nie zadziała. Wybór głosu i tempa zapisany w przeglądarce (`src/services/settings.ts`) | Głosy Piper: `src/services/speech/piper/voices.ts`. Inny silnik: nowa klasa `SpeechProvider` (`src/services/speech/types.ts`) i podmiana w `src/services/speech/index.ts`. Płatny TTS powinien iść przez serwer (klucz). |
| Narrator | Claude, z zapasowym składaniem fragmentów | Nowa klasa `StoryProvider` w `src/services/story/`, kolejność w `index.ts`. Model i prompt: `server/storyHandler.ts`. |
| Wygląd | design system „Sunrise Walk” (https://claude.ai/artifact/SfukogqxVytoEASXGxUQvM): tokeny kolorów, typografii, odstępów, zaokrągleń i cieni; kroje Righteous (nagłówki) i Rubik (tekst) hostowane z aplikacją; komponenty `sw-btn`, `sw-card`, `sw-input`, `sw-badge`, `sw-route`; tymczasowe logo „spacer”; ilustracje geometryczne w stylu DiceBear Shapes; tryb ciemny przez `data-theme` według ustawień telefonu; akcje opisane słowami (zestaw ikon niewybrany) | Tokeny: podmień `src/design/tokens.json` i uruchom `npm run tokens` (generuje `src/design/tokens.css`). Komponenty: `src/design/components.css` (kopia `bundle.css` design systemu). Logo: `src/components/Logo.tsx`. Ilustracje: `src/components/ShapeArt.tsx`. |
| Przewodnik | 3 postacie (Kompas, Sowa, Liść) z geometrycznymi awatarami (ShapeArt); każda ma własny głos Piper — zmiana postaci = zmiana głosu | `src/guides.ts`. |
| Profil (przewodnik, zainteresowania) | zapisany tylko w przeglądarce (`spacer.profile` w localStorage), bez kont; ekran powitalny przy pierwszym uruchomieniu, potem Ustawienia | `src/services/profile.ts`. Przy wprowadzeniu kont: przenieść profil na konto przy pierwszym logowaniu. |
| Moje historie | każda wygenerowana historia zapisuje się automatycznie w przeglądarce (`spacer.stories` w localStorage): tytuł, tekst, nazwy miejsca (ulica, dzielnica, miasto), linki do źródeł, data — bez współrzędnych. Ponowne odsłuchanie nic nie kosztuje (głos generuje telefon) | `src/services/storyLibrary.ts`. Przy większej liczbie historii lub kontach: IndexedDB lub baza na serwerze. |
| Personalizacja | zainteresowania (ogólne ciekawostki, natura, architektura) są zapisywane, ale jeszcze nie wpływają na opowieść | Dodać pola do `StoryRequest` (`src/shared/storyApi.ts`) i uwzględnić je w prompcie. |
| Promień, liczba miejsc | 1 km, 10 miejsc | `src/config.ts`. |
| Wyszukiwarka miejsc | Photon (OpenStreetMap, publiczna instancja, uczciwe użycie) + zabytki z Wikipedii; cały świat z priorytetem dla Polski; poziomy: kraj, region, miasto, dzielnica, ulica, obiekt. Kraj, region i miasto to opowieść o całości (`scope: "overview"`: tylko artykuł o miejscu, dłuższy tekst, bez obiektów wokół środka); dzielnica, ulica i obiekt — o miejscu i okolicy. Nazwy z mapy zawsze lokalne (`lang=default`), kraje po polsku z kodu ISO. Artykuł o mieście/kraju/obiekcie przyjmowany tylko, gdy jego współrzędne leżą blisko wybranego punktu i nie jest stroną ujednoznaczniającą (chroni przed „Warsaw”/„Krakow” = miejscowości w USA). Wpisane frazy nie są zapisywane | `src/services/placeSearch.ts`; promienie per poziom i środek priorytetu: `src/config.ts`. Przy większym ruchu: własna instancja Photon lub płatny dostawca (Mapbox, Google Places). Nominatim zostaje tylko do rozpoznania miejsca z GPS (jego regulamin zabrania podpowiedzi w trakcie pisania). |
| Tryb | „opowiedz o miejscu, gdzie stoję” albo o miejscu z wyszukiwarki (ton opowieści na razie ten sam) | Tryb spaceru/trasy to nowy przepływ obok `useGuide.ts` (np. `watchPosition`). |

## Trudne do zmiany (ustalone)

1. **Platforma: React + TypeScript jako PWA.** Później można opakować w aplikację natywną (Capacitor) bez przepisywania. Pełne prowadzenie przy zablokowanym ekranie wymaga aplikacji natywnej.
2. **Konta: brak.** Preferencje i (w przyszłości) zapisane historie trzymamy w przeglądarce. Gdy pojawią się konta (np. Supabase), dane z telefonu przenosimy na konto przy pierwszym logowaniu. Ograniczenia: dane tylko na jednym urządzeniu; Safari może je usunąć po ok. 7 dniach nieużywania strony (nie dotyczy aplikacji dodanej do ekranu głównego).
3. **Opowieści generowane na żywo.** Kontrakt `StoryRequest → Story` pozwala dołożyć pamięć podręczną (gotowe opowieści per miejsce i język) jako kolejny `StoryProvider`, gdy ruch i koszty urosną.
4. **Licencja treści.** Wikipedia jest na CC BY-SA: zawsze pokazujemy źródła i licencję; opowieści oparte na Wikipedii traktujemy jako udostępniane na tej samej licencji.
5. **Prywatność.** Współrzędne nie są zapisywane; „Moje historie” trzymają tylko nazwę miejsca, wyłącznie na urządzeniu użytkownika. Współrzędne trafiają tylko do Nominatim i Wikipedii; model AI dostaje nazwy miejsc i artykuły, bez współrzędnych. Zapisywanie historii miejsc wymagałoby zgód i polityki prywatności (RODO).
6. **Hosting: Vercel.** Frontend statyczny + funkcja `api/story.ts`. Logika serwera jest w `server/` jako zwykła funkcja `Request → Response`, więc przeniesienie na inny hosting to nowy cienki adapter.

## Znane ograniczenia prototypu

- Głosy Piper: pierwsze użycie pobiera ok. 63 MB (potem z pamięci telefonu); na starszych telefonach start mowy może trwać kilka sekund. Przed komercyjnym użyciem sprawdzić licencję każdego głosu w jego karcie modelu (MODEL_CARD na huggingface.co/rhasspy/piper-voices).
- Silnik `onnxruntime-web` musi mieć dokładnie wersję 1.18.0 — biblioteka Piper pobiera pliki WASM tej wersji z CDN.
- iOS nie udostępnia stronom pobranych w Ustawieniach głosów „Rozszerzony”/„Premium” — dlatego Piper.

- Publiczny Nominatim ma limit 1 zapytania/s; przy większym ruchu potrzebny płatny dostawca lub własna instancja.
- Jakość głosu zależy od telefonu (iOS ma zwykle lepsze polskie głosy niż Android).
- Na iPhonie odtwarzanie i lokalizacja zatrzymują się po zablokowaniu ekranu.
