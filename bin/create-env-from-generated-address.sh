#!/sh/bin
FILEPATH=/addresses/addresses.yaml
NO=$(($(awk '/nemesis_addresses:/ {print NR}' $FILEPATH) +1))
PRIVATE_KEY=$(awk -v no=$NO 'NR == no {print $3}' $FILEPATH)
echo "NEM_PRIVATE_KEY=$PRIVATE_KEY" > .env
