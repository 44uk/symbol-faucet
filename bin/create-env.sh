#!/bin/sh

# get nemesis private key from generated addresses
FILEPATH=/addresses/addresses.yaml
if [ -f $FILEPATH ]; then
  NO=$(($(awk '/nemesis_addresses:/ {print NR}' $FILEPATH) +1))
  PRIVATE_KEY=$(awk -v no=$NO 'NR == no {print $3}' $FILEPATH)
  echo "NEM_PRIVATE_KEY=$PRIVATE_KEY" > .env
fi

# get min fee multiplier from generated config
CONFIGPATH=/userconfig/resources/config-node.properties
if [ -f $CONFIGPATH ]; then
  MIN_FEE_MULTIPLIER=$(grep -oE "minFeeMultiplier\s*=\s*(\d+)" /userconfig/resources/config-node.properties | awk 'match($0,/[0-9]+/){print substr($0,RSTART,RLENGTH)}')
  echo "NEM_FEE_MULTIPLIER=$MIN_FEE_MULTIPLIER" >> .env
fi

# get generation hash from generated block
BLOCKPATH=/data/00000/00001.dat
if [ -f $BLOCKPATH ]; then
  GENERATION_HASH=$(xxd -p -c 32 -s 5304 -l 32 $BLOCKPATH | tr "[:lower:]" "[:upper:]")
  echo "NEM_GENERATION_HASH=$GENERATION_HASH" >> .env
fi
