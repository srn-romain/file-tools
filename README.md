# OmniTools — Suite d'Outils Gratuits 100% Client-Side

Une suite d'outils web modernes, élégants et instantanés, fonctionnant **entièrement dans votre navigateur (aucun backend)** et conçus pour être hébergés directement sur **GitHub Pages**.

---

## 🧭 Menu déroulant multi-outils

Le bouton en haut à gauche est une **liste déroulante interactive** permettant de basculer instantanément entre vos outils :
- ✂️ **Détourage d'image (ClearCut)**
- 📑 **Organisateur de PDF (PDF Studio)**
- 🗜️ **Compresseur de fichiers (Images & PDF)**
- 🖼️ **Assembleur & Fusion Photo**

---

## 🖼️ Outil 1 : Assembleur & Fusion Photo

Assemblez et combinez jusqu'à 100 photos en une seule image haute définition, directement sur votre navigateur :

### Fonctionnalités :
1. **Importation multiple & intuitive** :
   - Jusqu'à 100 photos simultanées (JPG, PNG, WebP, GIF, AVIF).
   - Glisser-déposer sur la zone de dépôt.
   - Coller direct avec <kbd>Ctrl</kbd> + <kbd>V</kbd>.
   - Bouton de démonstration avec chargement de photos d'exemple en 1 clic.
2. **Ordre & Réorganisation des photos** :
   - Liste des vignettes avec numérotation (`#1`, `#2`...).
   - Boutons fléchés pour monter / descendre les photos.
   - Bouton Inverser l'ordre et Tri alphabétique A-Z.
   - Bouton supprimer par photo ou réinitialisation totale.
3. **Dispositions multiples** :
   - **Côte à côte** : alignement horizontal sur une seule ligne.
   - **Grille personnalisée** : nombre de colonnes réglable (de 1 à 50) avec curseur en temps réel.
   - **Vertical** : empilement vertical fluide.
4. **Réglages visuels & Stylisation** :
   - Espacement entre les photos (0 à 60 px).
   - Marge externe du cadre (0 à 80 px).
   - Coins arrondis sur chaque photo (0 à 30 px).
   - Mode d'ajustement : *Conserver proportions* (contain) ou *Remplir les cases* (crop).
   - Couleur de fond personnalisable : Sombre studio, Blanc, Noir, Damier transparent ou palette chromatique libre.
5. **Aperçu & Export** :
   - Aperçu interactif avec zoom (+ / - / 100%).
   - Indicateur en direct des dimensions (`L × H px`) et du poids estimé en Mo.
   - Choix de la résolution maximale (jusqu'à Ultra HD 12288 px) et de la qualité de compression JPEG.
   - Formats d'exportation : JPEG (.jpg), PNG (.png), WebP (.webp).
   - Copier directement l'image dans le presse-papier ou télécharger l'image finale.

---

## 🗜️ Outil 2 : Compresseur de fichiers (Images & PDF)

Optimisez et réduisez la taille de vos fichiers sans perte visible de qualité, directement sur votre appareil :
- Images (JPEG, PNG, WebP) et documents PDF.
- Jauge comparative : Taille originale ➔ Taille compressée avec badge d'économie en pourcentage.
- Préréglages rapides (🚀 Maximale ~50%, ⚖️ Équilibrée ~75%, 💎 Légère ~90%), curseur fin et échelle de résolution.
- Téléchargement direct.

---

## 📑 Outil 3 : Organisateur & Fusion de PDF

Manipulez, réorganisez, pivotez et allégez vos documents PDF directement sur votre PC :
- Importation multi-fichiers et glisser-déposer.
- Miniatures de chaque page avec badges de position et nom de fichier.
- Déplacement des pages, rotation (90° / 180° / 270°) et exclusion des pages indésirables (décocher pour ignorer).
- Assemblage vectoriel instantané sans perte de qualité via `pdf-lib`.

---

## ✂️ Outil 4 : Détourage d'image par IA (ClearCut)

Détourage automatique et retouche haute précision inspirée de [remove.bg](https://www.remove.bg/fr/upload) :
- Modèle IA ISNet FP32 pour les cheveux et contours fins.
- Outils de retouche manuelle (Gomme & Pinceau Restaurer) avec tolérance de bord et historique.
- Prévisualisations multiples (Arrière-plan éliminé, Original, Comparateur coulissant avant/après).
- Fonds personnalisables (transparent, blanc, noir, bokeh, dégradé studio, fond vert).

---

## 🚀 Déploiement sur GitHub Pages (Zéro compilation)

1. Poussez les fichiers sur votre dépôt GitHub :
   ```bash
   git add .
   git commit -m "feat: Multi-tool suite (ClearCut, PDF Studio, Compressor & Photo Merger)"
   git push origin main
   ```
2. Dans les paramètres de votre dépôt GitHub :
   - Rendez-vous dans **Settings** > **Pages**.
   - Sous **Build and deployment** > **Source**, choisissez **Deploy from a branch**.
   - Sélectionnez la branche **`main`** et le dossier **`/ (root)`**, puis cliquez sur **Save**.
3. Votre site est immédiatement disponible à l'adresse :
   `https://<votre-utilisateur>.github.io/<nom-du-repo>/`

---

## 💻 Test local

```bash
# Avec Python 3
python -m http.server 8088

# Ou avec Node.js
npx serve
```
Accédez à [http://localhost:8088](http://localhost:8088) dans votre navigateur.
