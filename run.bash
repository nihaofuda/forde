#!/bin/bash

if [ $# -eq 0 ]
  then
    echo "Please provide number of iterations as argument"
    exit 1
fi

n=$1

for ((i=1;i<=n;i++)); do
  npm run all $1-$i $2
  sleep 5s
done
