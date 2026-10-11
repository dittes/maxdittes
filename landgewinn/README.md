# Landgewinn · Snack Attack

Ein mobiles Territory-Arcade-Spiel in reinem HTML, CSS und JavaScript. Rücklink: https://maxdittes.com.

## Lokal spielen

```sh
npm run dev
```

Danach http://localhost:4173 öffnen. Keine Installation und keine Laufzeitabhängigkeiten nötig. ES-Module benötigen einen HTTP-Server; ein Doppelklick auf die HTML-Datei reicht deshalb nicht in jedem Browser.

```sh
npm test
npm run build
```

`dist/` enthält die veröffentlichbare statische Website. Kann auch unter `/landgewinn/` gehostet werden; alle Assetpfade sind relativ. Kein Backend, kein Tracking, keine Werbung. Fortschritt, ausgewählter Skin und Tonoption werden lokal im Browser gespeichert. Der Browser benötigt zum ersten Laden eine Verbindung; es wird kein Service Worker installiert.

## Spielregeln und Steuerung

- Figur bewegt sich kontinuierlich. Auf Touchscreens Finger auf die Arena legen und zum Lenken ziehen; der virtuelle Joystick folgt der Richtung. Ein zweiter Finger kann den Turbo halten.
- Desktop: Maus im Spielfeld oder WASD/Pfeiltasten. Leertaste aktiviert Turbo, P/Escape pausiert.
- Eigenes Gebiet verlassen, Schleife ziehen und zurückkehren: Die eingeschlossene Fläche wird erobert. Umsetzung mit begrenztem Raster und Flood-Fill vom Arenarand.
- Gegnerische offene Spuren durchtrennen, eigene schützen. Das Kreuzen der eigenen Spur ist erlaubt. Bots kehren nach vier Sekunden an freien Positionen zurück.
- Turbo: 1,72-faches Tempo, Energieverbrauch 30/s und Regeneration 14/s. Wandnähe unter 2,3 Rasterzellen: 1,48-faches Tempo. Beide Boni lassen sich kombinieren.
- Zufällige Gegenstände: Krümel (+1, +7 Turboenergie), Schild (8 s/ein Treffer), Chili (6 s), Magnet (10 s), Frost (4 s).
- Flächenziel erreichen → Konfetti und Siegestanz → eine von drei Kisten öffnen → neues Level. Jeder erste Levelsieg garantiert einen noch nicht gesammelten Skin, solange welche fehlen. Wiederholte Siege geben 25 Bonuskrümel. Alle Skins sind kosmetisch.
- Ein noch nicht geöffneter Bonus bleibt beim Neuladen erhalten. Aktive Runden werden nicht gespeichert. Tabwechsel/Fokusverlust pausieren automatisch.

## 100 Levels

10 Farbwelten mit je 10 Levels. Bot-Anzahl wächst alle sechs Levels von 2 auf 18. Geschwindigkeit, Wendigkeit, Ausflugslänge und Wahrscheinlichkeit gezielter Angriffe steigen mit jedem Level. Flächenziele wachsen von 18 % auf 51 %. Die Bots spielen tatsächlich: Sie planen Ausflüge, schließen eigene Flächen, schneiden Spuren und verteidigen/erobern Gebiete. Die 100 Konfigurationen sind spielbar und werden nacheinander freigeschaltet; es sind keine 100 manuell gezeichneten Karten.

## Technik

- `engine.js`: DOM-unabhängige Simulation, KI, Capture, Kollisionen, Items und Levelkurve.
- `game.js`: Canvas-Renderer, Eingabe, Kamera, Partikel, Audio, Menüs, Bonus und Speicher.
- `styles.css` / `tokens.css`: Responsive Gestaltung, Animationen, reduzierte Bewegung und Fokuszustände.
- `assets/food/`: 18 lokal mitgelieferte 3D-Emoji-Sprites. 2D-Canvas mit 3D-gerenderten Grafiken, Schatten und Bewegung, kein WebGL-/3D-Physikspiel.
- `tests/engine.test.js`: deterministische Tests der Mechanik und aller Levelparameter.

## Recherche und Assets

Recherche am 11.10.2026:

- Offizielle Produktseite: https://voodoo.io/paper2 — reduzierte Arena, farbige Reviere, plastische Figuren und offene Spuren.
- Offizieller App-Store-Eintrag: https://apps.apple.com/us/app/paper-io-2/id1423046460 — Gebiete durch Rückkehr erobern, Spurangriffe, Charaktere und Belohnungen. Aktuelle Versionshinweise erlauben das Kreuzen der eigenen Spur.
- Support: https://support.paper.io/ — Einstieg, Fortschritt und Spielregeln.

Eigenständige Gestaltung und Implementierung; keine Originalgrafiken oder Originalcode von Paper.io übernommen.

Food-Assets: Microsoft Fluent Emoji (3D), https://github.com/microsoft/fluentui-emoji, MIT-Lizenz. Vollständiger Lizenztext in `assets/FLUENT-EMOJI-LICENSE.txt`. Weitere Icons sind Unicode-Zeichen.

## Verifikation

12 automatisierte Tests bestanden: 100 Levelkonfigurationen, geschlossene/offene Flächen, Rückkehr ins Gebiet, Trail-Kollision, Schild, alle Pickups, Turbo, Wandbonus, Sieg, Pause und autonome Bots bei Level 1/50/100.

Im echten Browser geprüft: Runde gespielt und Level 1 mit 19,8 % gewonnen; Niederlage/Neustart, Siegestanz, Bonuskiste, neuer Sushi-Skin, nächstes Level, Pause sowie Persistenz nach Neuladen. Layouts bei 320, 375, 414 und 768 CSS-Pixeln ohne horizontalen Überlauf; Desktop ebenfalls visuell geprüft. Kein Test auf physischer iOS-/Android-Hardware. Die vollständige Kampagne wurde nicht manuell durchgespielt; langfristiges Balancing benötigt Spieltests.
