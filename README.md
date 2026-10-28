# Spacer

Głosowy przewodnik po okolicy, w której jesteś. Spacer ustala Twoją lokalizację, rozpoznaje ulicę, dzielnicę i miasto, zbiera artykuły z Wikipedii o tym miejscu i pobliskich punktach, a potem opowiada o nich na głos.

Wersja: prototyp (PWA — działa w przeglądarce telefonu, można ją dodać do ekranu głównego).

## Jak to działa

1. **Lokalizacja**: przeglądarka (Geolocation API, wymaga HTTPS i zgody użytkownika).
2. **Gdzie jestem**: OpenStreetMap Nominatim (współrzędne → ulica, dzielnica, miasto).
3. **Źródła**: Wikipedia (artykuły o ulicy, dzielnicy, mieście i miejscach w promieniu 1 km).
4. **Opowieść**: model Claude na serwerze (`/api/story`) pisze narrację wyłącznie na podstawie artykułów. Bez klucza API aplikacja składa opowieść z fragmentów Wikipedii.
5. **Głos**: synteza mowy wbudowana w telefon (Web Speech API).

## Uruchomienie lokalne

```bash
npm install
cp .env.example .env.local   # i wklej ANTHROPIC_API_KEY (opcjonalnie)
npm run dev
```

Na telefonie lokalizacja działa tylko przez HTTPS, więc najprościej testować na wdrożeniu (Vercel).

## Wdrożenie na Vercel

1. Załóż konto na [vercel.com](https://vercel.com) przez GitHub.
2. **Add New → Project** → wybierz repozytorium `spacer` → **Deploy** (ustawienia wykryją się same).
3. Klucz API: [console.anthropic.com](https://console.anthropic.com) → **API Keys** → utwórz klucz (wymaga doładowania środków; to osobne rozliczenie niż subskrypcja Claude).
4. Na Vercelu: **Settings → Environment Variables** → `ANTHROPIC_API_KEY` = Twój klucz → zapisz i zrób **Redeploy**.
5. Otwórz adres `https://…vercel.app` na telefonie i dodaj do ekranu głównego.

Nigdy nie wpisuj klucza do kodu ani do repozytorium.

## Struktura

```
api/story.ts                 funkcja serwerowa Vercela (POST /api/story)
server/storyHandler.ts       prompt i wywołanie modelu Claude
src/config.ts                język, promień wyszukiwania
src/i18n/                    teksty interfejsu (nowy język = nowy plik)
src/services/geolocation.ts  lokalizacja urządzenia
src/services/geocoding.ts    współrzędne → ulica/dzielnica/miasto
src/services/wikipedia.ts    zbieranie artykułów
src/services/story/          wymienialni „narratorzy” (AI, fragmenty)
src/services/speech/         wymienialne głosy (Web Speech, w przyszłości płatny TTS)
src/shared/storyApi.ts       kontrakt aplikacja ↔ serwer
src/useGuide.ts              cały przepływ krok po kroku
```

Decyzje architektoniczne i to, jak je zmienić: [docs/decyzje.md](docs/decyzje.md).
