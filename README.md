# THE FLOOR – HOME EDITION ONLINE

## Pornire locală
1. Instalează Node.js 18+ de la https://nodejs.org/
2. Dezarhivează proiectul.
3. Deschide terminalul în folderul proiectului.
4. Rulează `npm install`
5. Rulează `npm start`
6. Deschide http://localhost:3000

## Acces de la distanță
Pentru ca prietenii să intre de oriunde, publică proiectul pe un serviciu de hosting Node.js care suportă WebSockets (de exemplu Render, Railway sau VPS).
- Install command: `npm install`
- Start command: `npm start`
- Port: variabila de mediu `PORT`
După publicare, trimite invitaților URL-ul aplicației. Ei intră pe site și introduc codul camerei.

## Reguli
- Maximum 12 jucători și 12 teritorii (grilă 4×3), câte unul la început pentru fiecare participant.
- Atacurile sunt permise doar între teritorii vecine pe verticală/orizontală.
- Atacatorul răspunde primul; după fiecare răspuns corect, rândul alternează.
- Cronometrul de 60 secunde este gestionat de server.
- Primul răspuns greșit pierde; la expirarea timpului pierde jucătorul al cărui rând este.
- Câștigătorul preia teritoriul apărătorului; jocul se încheie când un singur jucător deține toate teritoriile.

## Limitări ale prototipului
Camerele sunt păstrate în memoria serverului și dispar dacă serverul repornește. Banca de întrebări este demonstrativă. Nu există conturi, chat vocal sau persistență în bază de date. Pentru producție recomand HTTPS, protecție anti-abuz și stocare persistentă.
