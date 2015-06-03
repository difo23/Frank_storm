echo "# Frank_storm" >> README.md
git init
git add README.md
git commit -m "first commit"
git remote add origin https://github.com/difo23/Frank_storm.git
git pull
# Fix any merge conflicts, if you have a `README.md` locally
git push -u origin master
