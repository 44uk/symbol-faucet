#!/bin/sh
sleep 3

# get nemesis private key from generated addresses
FILEPATH=/addresses/addresses.yaml
NO=$(($(awk '/nemesis_addresses:/ {print NR}' $FILEPATH) +1))
PRIVATE_KEY=$(awk -v no=$NO 'NR == no {print $3}' $FILEPATH)
echo "NEM_PRIVATE_KEY=$PRIVATE_KEY" > .env

# get generation hash from generated block
BLOCKPATH=/data/00000/00001.dat
GENERATION_HASH=$(xxd -p -c 32 -s 5246 -l 32 $BLOCKPATH | tr "[:lower:]" "[:upper:]")
echo "NEM_GENERATION_HASH=$GENERATION_HASH" >> .env
