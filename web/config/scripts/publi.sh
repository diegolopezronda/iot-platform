#API
if test $1 != "test"; then
	sed -i "/^.*console\..*(.*).*$/d" api/*.js; 
fi
prettier --use-tabs --write --trailing-comma none --single-quote false api/*.js
#ROUTES
if test $1 != "test"; then
	sed -i "/^.*console\..*(.*).*$/d" routes/*.js; 
fi
prettier --use-tabs --write --trailing-comma none --single-quote false routes/*.js
#CONTROLLER
prettier --use-tabs --write --trailing-comma none --single-quote false controllers/*/*.js;
rm -rf public/ng/;
mkdir public/ng;
cp -rf controllers/* public/ng; 
cat public/ng/*/*.js > angular.js;
rm public/ng/*/*.js;
mv angular.js public/ng/app.js;
if test $1 != "test"; then
	sed -i "/^.*console\..*(.*).*$/d" controllers/*/*.js; 
	sed -i "/^.*console\..*(.*).*$/d" public/ng/app.js; 
fi
uglifyjs public/ng/app.js -c -m -o public/ng/app.js
#LISTS
prettier --use-tabs --write --trailing-comma none --single-quote false public/js/init.js
prettier --use-tabs --write --trailing-comma none --single-quote false public/js/lists.js
