# 📚 Organized - Piano di Studio AI

Un'applicazione web che sincronizza i dati da **ClasseViva** e utilizza l'**intelligenza artificiale** per organizzare automaticamente le tue giornate di studio, senza mancare nulla.

## ✨ Funzionalità

- 🔄 **Sincronizzazione ClasseViva**: Importa automaticamente compiti, verifiche ed eventi dalla tua agenda scolastica
- 🤖 **Organizzazione AI**: L'intelligenza artificiale crea un piano di studio personalizzato e ottimizzato
- 📱 **Interfaccia Moderna**: Design responsive e intuitivo con supporto dark mode
- 📅 **Esportazione iCal**: Esporta il piano su Google Calendar, Apple Calendar o qualsiasi app compatibile
- 📝 **Integrazione Notion**: Sincronizza il tuo piano di studio direttamente su Notion
- 🎯 **Tracciamento Progressi**: Segna le attività completate e monitora i tuoi progressi

## 🚀 Inizia

### Prerequisiti

- Node.js 18+ 
- npm o yarn
- (Consigliato) `GEMINI_API_KEY` per la generazione AI avanzata

### Installazione

1. Clona il repository:
```bash
git clone https://github.com/open-viva/organized.git
cd organized
```

2. Installa le dipendenze:
```bash
npm install
```

3. Crea un file `.env.local` basato su `.env.example`:
```bash
cp .env.example .env.local
```

4. Configura la chiave Gemini in `.env.local`:
```
GEMINI_API_KEY=your-gemini-api-key
```

5. Avvia il server di sviluppo:
```bash
npm run dev
```

6. Apri [http://localhost:3000](http://localhost:3000) nel browser

## 🔑 Autenticazione ClasseViva

L'app supporta due metodi di accesso:

### Login con Email
Usa le credenziali email/password del tuo account ClasseViva.

### Login con Codice Studente  
Usa il codice studente (es. S1234567A) e la password dell'account.

> **Nota**: Le credenziali vengono usate solo per accedere ai servizi ClasseViva e non vengono memorizzate sui nostri server.

## 🖥️ Backend open-viva/api (Consigliato)

Per bypassare il WAF di Akamai che blocca le richieste da IP non residenziali, l'app supporta l'integrazione con [open-viva/api](https://github.com/open-viva/api).

### Perché usare il backend?

Le API di ClasseViva (web.spaggiari.eu) sono protette da Akamai WAF che blocca le richieste provenienti da IP di datacenter (Vercel, AWS, etc.). `open-viva/api` gestisce autenticazione/sessioni e semplifica l'accesso agli endpoint agenda/voti.

### Configurazione

1. Clona e avvia open-viva/api:
```bash
git clone https://github.com/open-viva/api.git
cd api
npm install
npm run start
```

2. Nella pagina di login dell'app, clicca su **"Configurazione Backend"**
3. Assicurati che "Usa backend locale" sia selezionato
4. L'URL di default è `http://localhost:3000`
5. (Opzionale) Inserisci l'API key se configurata nel backend

### Deploy su Vercel

Imposta queste variabili in Vercel:
- `GEMINI_API_KEY`
- `NEXT_PUBLIC_OPENVIVA_API_URL`

## 📱 Integrazione Agenda (open-viva/api)

L'app usa gli endpoint del backend open-viva/api:
- `POST /api/login`
- `GET /api/agenda?begin=YYYY-MM-DD&end=YYYY-MM-DD`
- `GET /api/grades`

## 📝 Integrazione Notion

Per esportare il piano su Notion:

1. Vai su [notion.so/my-integrations](https://www.notion.so/my-integrations)
2. Crea una nuova integrazione
3. Copia il token di integrazione
4. Condividi la pagina Notion di destinazione con l'integrazione
5. Copia l'ID della pagina dall'URL
6. Inserisci token e ID nell'app

## 📅 Esportazione iCal

L'app genera file `.ics` compatibili con:
- Google Calendar
- Apple Calendar
- Microsoft Outlook
- Qualsiasi app calendario con supporto iCal

## 🛠️ Tecnologie

- **Framework**: [Next.js 16](https://nextjs.org/) (App Router)
- **UI**: [Tailwind CSS 4](https://tailwindcss.com/)
- **State Management**: [Zustand](https://zustand-demo.pmnd.rs/)
- **AI**: Gemini 2.5 Flash (via API key `GEMINI_API_KEY`)
- **Icons**: [Lucide React](https://lucide.dev/)
- **iCal Generation**: [ical-generator](https://github.com/sebbo2002/ical-generator)
- **Date Handling**: [date-fns](https://date-fns.org/)

## 📁 Struttura Progetto

```
src/
├── app/
│   ├── api/
│   │   ├── classeviva/    # API ClasseViva proxy
│   │   ├── organize/      # AI schedule generation
│   │   ├── notion/        # Notion integration
│   │   └── ical/          # iCal export
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── Dashboard.tsx      # Main dashboard
│   ├── LoginForm.tsx      # ClasseViva login
│   ├── ScheduleView.tsx   # Weekly schedule display
│   └── NotionModal.tsx    # Notion integration modal
├── lib/
│   ├── classeviva.ts      # ClasseViva API functions
│   ├── ai-organizer.ts    # AI schedule generation
│   ├── notion.ts          # Notion API functions
│   └── ical.ts            # iCal generation
├── store/
│   └── index.ts           # Zustand store
└── types/
    └── index.ts           # TypeScript types
```

## 🔒 Privacy e Sicurezza

- Le credenziali ClasseViva vengono usate solo per l'autenticazione
- I dati vengono memorizzati localmente nel browser (localStorage)
- Nessun dato viene inviato a server terzi (eccetto Gemini per la generazione AI)
- Il token Notion rimane salvato localmente

## 🤝 Contribuire

I contributi sono benvenuti! Per favore:

1. Fai un fork del repository
2. Crea un branch per la tua feature (`git checkout -b feature/nuova-feature`)
3. Committa le modifiche (`git commit -m 'Aggiunge nuova feature'`)
4. Pusha il branch (`git push origin feature/nuova-feature`)
5. Apri una Pull Request

## 📄 Licenza

MIT License - vedi il file [LICENSE](LICENSE) per i dettagli.

## 🙏 Ringraziamenti

- [ClasseViva](https://web.spaggiari.eu/) per il sistema di gestione scolastica
- [Classeviva-Official-Endpoints](https://github.com/Lioydiano/Classeviva-Official-Endpoints) per la documentazione API
- La community open source per le librerie utilizzate
