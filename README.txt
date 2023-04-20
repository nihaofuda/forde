在当前文件夹右键，点击 git bash here；
输入: bash run.bash  部份数(要把数据分成多少个部分处理) 浏览器个数（默认为3）
e.g. bash run.bash 10 2

或者手动使用 npm run all 10-1 2 命令一部分一部分跑
其中 10 为部分数， 1为需要跑的部分， 2为浏览器个数，跑完1后，可以再执行 npm run all 10-2 进行下一部分运行