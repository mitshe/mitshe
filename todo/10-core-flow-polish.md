# 10 — Core Flow Polish

## Docelowa sciezka uzycia

```
1. TASK z Jira/GitHub → import (bulk lub pojedynczy)
2. SESJA ze snapshota → szybki start z gotowym srodowiskiem
3. PRACA z Claude Code → terminal, edytor, git
4. TESTY w przegladarce → Chrome streaming przez noVNC
5. COMMIT/PR → push + create PR bezposrednio z sesji
```

## Co dziala

- [x] Import taskow z Jira/YouTrack (single URL + bulk assigned)
- [x] Tworzenie sesji z snapshota, repo, brancha
- [x] Terminal z Claude Code (pre-installed)
- [x] Browser tab z Chrome (noVNC, on-demand)
- [x] Push & Create PR z session detail
- [x] Polling na CREATING status
- [x] Stop faktycznie zatrzymuje kontener
- [x] Snapshot walidacja (FAILED gdy image usuniety)

## Co trzeba dopracowac

### Sesje
- [ ] SSH keys — user powinien moc wgrac klucz przez UI (Settings > SSH Keys)
      Klucz zapisany w DB zaszyfrowany, kopiowany do /home/executor/.ssh przy starcie sesji
      Alternatywa: user wchodzi w terminal i robi ssh-keygen + ssh-add recznie
- [ ] Login do Claude Code — po otwarciu sesji user musi recznie zalogowac sie
      Docelowo: mitshe powinien moc przekazac token/session do Claude Code CLI automatycznie
- [ ] Resume po usunieciu kontenera — nie pokazywac Resume jesli kontener nie istnieje
      Sprawdzac container state przed pokazaniem przycisku
- [ ] Session z wielu repo — aktualnie branch selector dziala dla pierwszego repo
      Docelowo: kazdy repo moze miec inny branch

### Browser/Chrome
- [ ] Chrome nie startuje na starym executor image — trzeba `just executor-build`
      Docelowo: Chrome zainstalowany w standardowym image, zawsze dostepny
- [ ] noVNC bialy ekran na desktop app — webSecurity:false nie wystarczy?
      Sprawdzic czy Electron blockuje WebSocket do innego portu
      Alternatywa: proxy noVNC przez API (ten sam port co reszta)
- [ ] Playwright + Chrome integration — Claude Code powinien moc:
      1. Podlaczyc sie do dzialajacego Chrome przez CDP (port 9222)
      2. Uruchamiac testy Playwright ktore uzywaja tego Chrome
      3. User widzi w noVNC co Playwright robi w real-time
- [ ] Nowa karta w Chrome — user chce otworzyc wiecej kart, chodzic po stronach

### Import taskow
- [ ] "Import all assigned" — aktualnie filtruje po statusach hardcoded
      Docelowo: user wybiera filtr (Assigned to me, My team, Sprint, Custom JQL)
- [ ] Duplikaty — aktualnie sprawdza externalIssueId
      Docelowo: refresh istniejacych taskow (update status z Jira)
- [ ] Polling/sync — periodyczny import nowych taskow z Jira
      Moze workflow z trigger:schedule co 15min
- [ ] GitHub Issues import — brak, tylko Jira/YouTrack
- [ ] Linear import — brak

### Snapshoty
- [ ] Snapshot z sesji ktora ma local mount — kopiuje pliki ale bez node_modules
      Docelowo: user powinien moc wybrac co kopiowac (whitelist/blacklist)
- [ ] Snapshot naming — automatycznie generowane z sesji name + timestamp
- [ ] Snapshot tags/categories — zeby latwiej znalezc wlasciwy

### Workflow
- [ ] Polling Jira/GitHub — trigger na nowe issues
      Docelowo: webhook (jesli jest publiczny URL) lub polling co X minut
- [ ] Automatyczne tworzenie sesji z workflow — template "Feature Development"
      Powinien dzialac end-to-end: trigger → session → claude → PR → notify

### UX ogolne
- [ ] Rename konwersacji chatowych
- [ ] Favorite/pin konwersacji
- [ ] Command Palette (Cmd+K) — wiecej akcji (Create session, Import tasks)
- [ ] Notyfikacje — session completed, workflow failed, PR created
- [ ] Dark/light mode — dopracowac kolory (sidebar kontrast, input borders)

## Priorytet (nastepne do zrobienia)

1. Browser streaming dziala na 100% (Chrome startuje, noVNC laczy sie)
2. Import taskow — refresh istniejacych, GitHub Issues
3. SSH keys przez UI
4. Workflow polling Jira
5. Command Palette rozszerzony
