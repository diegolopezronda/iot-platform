mysql sensum -u sensum -p -e "UPDATE user SET email_user = '$1' , password_user = MD5('$2') WHERE id_user = 1;"
