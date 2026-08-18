db.createUser(
  {
    user: "sensum",
    pwd: "sensum.s",
    roles: [ { role: "readWrite", db: "sensum" } ]
  }
)
db.assets.createIndex({id:1},{unique:true});
db.daily_data.createIndex({id:1},{unique:true});
db.data.createIndex({mac:1});
db.events.createIndex({mac:1});
db.items.createIndex({mac:1},{unique:true});
db.passwords.createIndex({date:1},{expireAfterSeconds:86400});
