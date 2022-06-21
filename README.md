# Hepcat project source tree

This is the source code for the Hepcat project. This software is used to help guide the discussion and manage conflicts during the ACM SIGGRAPH PC meeeting.

## To test at Heroku:

Visit: `https://hepcat1.herokuapp.com/`

## To clone and set up:

```
git clone https://github.com/adamfinkelstein/hepcat.git
cd hepcat
python3 -m venv venv
source venv/bin/activate
python -m pip install --upgrade pip
pip install -r requirements.txt
npm install
npm run build
```

