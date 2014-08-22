/*
File: TolZ LWG AI
Author: TolZ

For LWG Version: 1.9
AI Version: 1.01
Version Release Date: Aug 13, 2014

New To This Version: 
- Everything
*/

var MAXWORKERS = 27; //Maximum number of workers we ever need
var WORKERCASTLEDIST = 9; //Used to determine maximum distance for a worker to be "owned" by a castle
var MINEDIST = 7; //Used to keep buildings from blocking goldmines
var ATTACKTIME = 120; //Earliest time the AI will attack

//Building Costs
var HOUSECOST = 100;
var BARRACKSCOST = 200;
var GUILDCOST = 150;
var FORGECOST = 150;
var CASTLECOST = 300;

//Army Values
var WOLFVALUE = 1.5;
var SOLDIERVALUE = 2;
var RIFLEMANVALUE = 2;
var MAGEVALUE = 2.5;
var CATAVALUE = 3;
var DRAGONVALUE = 4;

var TOWERVALUE = 10;
var FORTVALUE = 10;

var ARMYPOSITION  = 0.3;

//Returns the distance between (x1, y1) and (x2, y2)
var distance = function(x1, y1, x2, y2) {
	return Math.sqrt(Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2));
}

//Takes in an object: object1 and an array of objects: arr1 and finds the closest object in arr1 to object1
var findClosest = function(object1, arr1) {
	var objectX = object1.getX();
	var objectY = object1.getY();
	var closest = arr1[0];
	var closestDist = distance(objectX, objectY, closest.getX(), closest.getY())
	for (var i = 1; i < arr1.length; i++) {
		var currentDist = distance(objectX, objectY, arr1[i].getX(), arr1[i].getY());
		if (closestDist >  currentDist) {
			closest = arr1[i];
			closestDist = currentDist;
		}
	}
	return closest;
}

//Sort an array based on the distance from an object (arr1[0] is closest, arr1[arr1.length - 1] is furthest)
var sortDistance = function(object1, arr1) {
	var objectX = object1.getX();
	var objectY = object1.getY();
	var swapsy;
	//Bubble sort
	for (var i = 0; i < arr1.length; i++) {
		for (var j = 0; j < arr1.length - i - 1; j++) {
			if (distance(objectX, objectY, arr1[j].getX(), arr1[j].getY()) >  distance(objectX, objectY, arr1[j + 1].getX(), arr1[j + 1].getY())) {
				swapsy = arr1[j];
				arr1[j] = arr1[j + 1];
				arr1[j + 1] = swapsy;
			}
		}
	}
	return arr1;
}

//Determines if a building can be built in the box with top-left corner (x1,y1) and bottom-right corner (x2,y2)
var isBuildable = function(x1, y1, x2, y2) {
	for (var x = x1; x <= x2; x++) {
		for (var y = y1; y <= y2; y++) {
			if (game.fieldIsBlocked(x,y)) {
				return false;
			}
		}
	}
	return true;
}

//Finds a location and orders construction of newBuilding
var constructBuilding = function(newBuilding) {
	var myPlayerNumber = scope.getMyPlayerNumber();
	var myBuildings = scope.getBuildings({player: myPlayerNumber});
	var workers = scope.getUnits({type: "Worker", order: "Mine", player: myPlayerNumber});
	var mines = scope.getBuildings({type: "Goldmine"});
	
	var buildingX = null;
	var buildingY = null;
	var buildingLength = null;
	var buildingWidth = null;
	var newBuildingX = null;
	var newBuildingY = null;
	var newBuildingLength = null;
	var newBuildingWidth = null;
	var closestMine = null;
	var castleMineDiffX = null;
	var castleMineDiffY = null;
	var startX = null;
	var startY = null;
	var endValue = null;
	var buildOrder = null;
	
	if (newBuilding == "House" || newBuilding == "Barracks"  || newBuilding == "Mages Guild") {
		newBuildingLength = 3;
		newBuildingWidth = 3;
	} else if (newBuilding == "Forge") {
		newBuildingLength = 4;
		newBuildingWidth = 4;
	}
	
	dance:
	for (var i = 0; i < myBuildings.length; i++) {
		buildingX = parseInt(myBuildings[i].getX());
		buildingY = parseInt(myBuildings[i].getY());
		closestMine = findClosest(myBuildings[i], mines);
		if (myBuildings[i].getTypeName() == "Castle" || myBuildings[i].getTypeName() == "Forge") {
			buildingX--;
			buildingY--;
			buildingLength = 4;
			buildingWidth = 4;
		} else if (myBuildings[i].getTypeName() == "House" || myBuildings[i].getTypeName() == "Barracks" || myBuildings[i].getTypeName() == "Mages Guild") {
			buildingLength = 3;
			buildingWidth = 3;
		}
		
		//Above
		startX = buildingX - newBuildingWidth - 2;
		startY = buildingY - newBuildingWidth - 2;
		endValue = buildingX + buildingWidth;
		for (; startX <= endValue; startX++) {
			if (isBuildable(startX, startY, startX + newBuildingWidth + 1, startY + newBuildingLength + 1)
				&& distance(startX + 1, startY + 1, closestMine.getX(), closestMine.getY()) > MINEDIST) {
				newBuildingX = startX + 1;
				newBuildingY = startY + 1;
				break dance;
			}
		}
		
		//Below
		startX = buildingX - newBuildingWidth - 2;
		startY = buildingY + buildingLength;
		endValue = buildingX + buildingWidth;
		for (; startX <= endValue; startX++) {
			if (isBuildable(startX, startY, startX + newBuildingWidth + 1, startY + newBuildingLength + 1)
				&& distance(startX + 1, startY + 1, closestMine.getX(), closestMine.getY()) > MINEDIST){
				newBuildingX = startX + 1;
				newBuildingY = startY + 1;
				break dance;
			}
		}
		
		//Left
		startX = buildingX - newBuildingWidth - 2;
		startY = buildingY - newBuildingWidth - 2;
		endValue = buildingY + buildingLength;
		for (; startY <= endValue; startY++) {
			if (isBuildable(startX, startY, startX + newBuildingWidth + 1, startY + newBuildingLength + 1)
			&& distance(startX + 1, startY + 1, closestMine.getX(), closestMine.getY()) > MINEDIST) {
				newBuildingX = startX + 1;
				newBuildingY = startY + 1;
				break dance;
			}
		}
		
		//Right
		startX = buildingX + buildingLength;
		startY = buildingY - newBuildingWidth - 2;
		endValue = buildingY + buildingLength;
		for (; startY <= endValue; startY++) {
			if (isBuildable(startX, startY, startX + newBuildingWidth + 1, startY + newBuildingLength + 1)
				&& distance(startX + 1, startY + 1, closestMine.getX(), closestMine.getY()) > MINEDIST) {
				newBuildingX = startX + 1;
				newBuildingY = startY + 1;
				break dance;
			}
		}	
	}
	
	if (newBuildingX != null) {
		buildOrder = "Build " + newBuilding;
		scope.order(buildOrder, workers, {x: newBuildingX, y: newBuildingY});
	}
	//Backup
	else {
		constructCastle();
	}
}

//Finds a location and orders construction of a castle
var constructCastle = function() {
	var myPlayerNumber = scope.getMyPlayerNumber();
	var myBuildings = scope.getBuildings({player: myPlayerNumber});
	var workers = scope.getUnits({type: "Worker", order: "Mine", player: myPlayerNumber});
	var mines = scope.getBuildings({type: "Goldmine"});
	var minesToBuilding = null;
	var allCastles = getBuildings({type: "Castle"});
	var allForts = getBuildings({type: "Fortress"});
	var allCastlesAndForts = allCastles.concat(allForts);
	var dist = null;
	var suitableMine = null;
	var theGoldmine = null;
	var theGoldmineX = null;
	var theGoldmineY = null;
	var newCastleX = null;
	var newCastleY = null;
	
	if (myBuildings.length > 0) {
		//Sorted list of Goldmine distance from one of my buildings
		minesToBuilding = sortDistance(myBuildings[0], mines);
		for (var i = 0; i < minesToBuilding.length; i++) {
			suitableMine = true;
			for (var j = 0; j < allCastlesAndForts.length; j++) {
				dist = distance(minesToBuilding[i].getX(), minesToBuilding[i].getY(), allCastlesAndForts[j].getX(), allCastlesAndForts[j].getY());
				if (dist <= 10) {
					suitableMine = false;
				}
			}
			if (suitableMine) {
				theGoldmine = minesToBuilding[i];
				break;
			}
		}
	} 
	if (theGoldmine != null) {
		theGoldmineX = parseInt(theGoldmine.getX());
		theGoldmineY = parseInt(theGoldmine.getY());
		
		//Above
		if (isBuildable(theGoldmineX - 1, theGoldmineY - 9, theGoldmineX + 2, theGoldmineY - 1)) {
			newCastleX = theGoldmineX - 1;
			newCastleY = theGoldmineY - 9;
		} else if (isBuildable(theGoldmineX, theGoldmineY - 9, theGoldmineX + 3, theGoldmineY - 1)) {
			newCastleX = theGoldmineX;
			newCastleY = theGoldmineY - 9;
		}
		//Below
		else if (isBuildable(theGoldmineX - 1, theGoldmineY + 3, theGoldmineX + 2, theGoldmineY + 11)) {
			newCastleX = theGoldmineX - 1;
			newCastleY = theGoldmineY + 8;
		} else if (isBuildable(theGoldmineX, theGoldmineY + 3, theGoldmineX + 3, theGoldmineY + 11)) {
			newCastleX = theGoldmineX;
			newCastleY = theGoldmineY + 8;
		}
		//Left
		else if (isBuildable(theGoldmineX - 9, theGoldmineY - 1, theGoldmineX - 1, theGoldmineY + 2)) {
			newCastleX = theGoldmineX - 9;
			newCastleY = theGoldmineY - 1;
		} else if (isBuildable(theGoldmineX - 9, theGoldmineY, theGoldmineX - 1, theGoldmineY + 3)) {
			newCastleX = theGoldmineX - 9;
			newCastleY = theGoldmineY;
		}
		//Right
		else if (isBuildable(theGoldmineX + 3, theGoldmineY - 1, theGoldmineX + 11, theGoldmineY + 2)) {
			newCastleX = theGoldmineX - 9;
			newCastleY = theGoldmineY - 1;
		} else if (isBuildable(theGoldmineX + 3, theGoldmineY, theGoldmineX + 11, theGoldmineY + 3)) {
			newCastleX = theGoldmineX + 8;
			newCastleY = theGoldmineY;
		}
		
		if (newCastleX != null) {
			scope.order("Build Castle", workers, {x: newCastleX, y: newCastleY});
		}
	}
}

//Edit the scope.getUnits functions so the computer doesn't have to see them to know they're there
var getUnits = function(filter)
{
	var units = [];
	
	if(!filter)
		filter = {};
	
	for(var i = 0; i < game.units.length; i++)
		if(
			(!filter.type || filter.type == game.units[i].type.name)
			&& (!filter.notOfType || filter.notOfType != game.units[i].type.name)
			&& (!filter.player || filter.player == game.units[i].owner.number)
			&& (!filter.team || filter.team == game.units[i].owner.team.number)
			&& (!filter.order || filter.order == game.units[i].order.name)
			&& (!filter.enemyOf || !game.players[filter.enemyOf] || (game.players[filter.enemyOf].team.number != game.units[i].owner.team.number && game.players[filter.enemyOf].team.number != 0))
		)
			units.push(new UnitWrapper(game.units[i]));
	
	return units;
}

//Edit the scope.getBuildings functions so the computer doesn't have to see them to know they're there
var getBuildings = function(filter)
{
	var buildings = [];
	
	if(!filter)
		filter = {};
	
	for(var i = 0; i < game.buildings.length; i++)
		if(
			(!filter.type || filter.type == game.buildings[i].type.name)
			&& (!filter.notOftype || filter.notOftype != game.buildings[i].type.name)
			&& (!filter.player || filter.player == game.buildings[i].owner.number)
			&& (!filter.team || filter.team == game.buildings[i].owner.team.number)
			&& (!filter.order || filter.order == game.buildings[i].order.name)
			&& (!filter.onlyFinshed || !game.buildings[i].isUnderConstruction)
			&& (!filter.enemyOf || !game.players[filter.enemyOf] || (game.players[filter.enemyOf].team.number != game.buildings[i].owner.team.number && game.players[filter.enemyOf].team.number != 0))
		)
			buildings.push(new UnitWrapper(game.buildings[i]));
	
	return buildings;
}

//Calculates the value of a teams army
var getTeamArmyValue = function(teamNum) {
	//Use the remade getUnits so the computer knows how big the enemies army is
	var soldiers = getUnits({type: "Soldier", team: teamNum}).length;
	var riflemen = getUnits({type: "Rifleman", team: teamNum}).length;
	var mages = getUnits({type: "Mage", team: teamNum}).length;
	var wolves = getUnits({type: "Wolf", team: teamNum}).length;
	var catapaults = getUnits({type: "Catapault", team: teamNum}).length;
	var dragons = getUnits({type: "Dragon", team: teamNum}).length;
	
	var teamArmyValue = (wolves * WOLFVALUE) + (soldiers * SOLDIERVALUE) + (riflemen * RIFLEMANVALUE)
	+ (mages * MAGEVALUE) + (catapaults * CATAVALUE) + (dragons * DRAGONVALUE);
	
	
	return teamArmyValue;
}

/**************************************
Game Variables
**************************************/
//Total number of elapsed seconds
var time = Math.floor(scope.getCurrentGameTimeInSec());

//Get all goldmines
var mines = scope.getBuildings({type: "Goldmine"});

/**************************************
My Variables
**************************************/
//Get my player number
var myPlayerNumber = scope.getMyPlayerNumber();

//Get my team number
var myTeamNumber = scope.getMyTeamNumber();

//Get my gold value
var gold = scope.getGold();

//Get my max supply
var maxSupply = scope.getMaxSupply();

//Get my current supply
var currentSupply = scope.getCurrentSupply();

//Get my buildings
var myBuildings = scope.getBuildings({player: myPlayerNumber});
var castles = scope.getBuildings({type: "Castle", player: myPlayerNumber});
var finishedCastles = scope.getBuildings({type: "Castle", player: myPlayerNumber, onlyFinshed: true});
//var forts = scope.getBuildings({type: "Fortress", player: myPlayerNumber});
//var finishedForts = scope.getBuildings({type: "Fortress", player: myPlayerNumber, onlyFinshed: true});
//var towers = scope.getBuildings({type: "Watchtower", player: myPlayerNumber});
//var finishedTowers = scope.getBuildings({type: "Watchtower", player: myPlayerNumber, onlyFinshed: true});
var houses = scope.getBuildings({type: "House", player: myPlayerNumber});
var finishedHouses = scope.getBuildings({type: "House", player: myPlayerNumber, onlyFinshed: true});
var forges = scope.getBuildings({type: "Forge", player: myPlayerNumber});
var finishedForges = scope.getBuildings({type: "Forge", player: myPlayerNumber, onlyFinshed: true});
//var dens = scope.getBuildings({type: "Wolves Den", player: myPlayerNumber});
//var finishedDens = scope.getBuildings({type: "Wolves Den", player: myPlayerNumber, onlyFinshed: true});
var barracks = scope.getBuildings({type: "Barracks", player: myPlayerNumber});
var finishedBarracks = scope.getBuildings({type: "Barracks", player: myPlayerNumber, onlyFinshed: true});
var guilds = scope.getBuildings({type: "Mages Guild", player: myPlayerNumber});
var finishedGuilds = scope.getBuildings({type: "Mages Guild", player: myPlayerNumber, onlyFinshed: true});
//var workshops = scope.getBuildings({type: "Workshop", player: myPlayerNumber});
//var finishedWorkshops = scope.getBuildings({type: "Workshop", player: myPlayerNumber, onlyFinshed: true});
//var lairs = scope.getBuildings({type: "Dragons Lair", player: myPlayerNumber});
//var finishedLairs = scope.getBuildings({type: "Dragons Lair", player: myPlayerNumber, onlyFinshed: true});
//var labs = scope.getBuildings({type: "Animal Testing Lab", player: myPlayerNumber});
//var finishedLabs = scope.getBuildings({type: "Animal Testing Lab", player: myPlayerNumber, onlyFinshed: true});

//Need an array of both my castles and forts
//var castlesAndForts = castles.concat(forts);
//var finishedCastlesAndForts = finishedCastles.concat(finishedForts);

//Get my units
var workers = scope.getUnits({type: "Worker", player: myPlayerNumber});
var idleWorkers = scope.getUnits({type: "Worker", player: myPlayerNumber, order: "Stop"});
var soldiers = scope.getUnits({type: "Soldier", player: myPlayerNumber});
var riflemen = scope.getUnits({type: "Rifleman", player: myPlayerNumber});
var mages = scope.getUnits({type: "Mage", player: myPlayerNumber});
var fightingUnits = scope.getUnits({notOfType: "Worker", player: myPlayerNumber});
//var allUnits = scope.getUnits({player: myPlayerNumber});

//Get my upgrade levels
var weaponUpgrade = game.players[myPlayerNumber].getUpgradeLevel(upgrades[0]);
var armorUpgrade = game.players[myPlayerNumber].getUpgradeLevel(upgrades[1]);
var mageFlame = game.players[myPlayerNumber].getUpgradeLevel(upgrades[2]);
var mageHeal = game.players[myPlayerNumber].getUpgradeLevel(upgrades[3]);

/**************************************
Enemy Variables
**************************************/
//Get an array of all my enemies
var enemies = scope.getArrayOfPlayerNumbers();
for (var i = 0; i < enemies.length; i++) {
	if (game.players[enemies[i]].team.number == myTeamNumber) {
		enemies.splice(i, 1);
	}
}

//Set a main enemy for any enemy
if (enemies.length > 0) {
	var mainEnemy = enemies[0];
	var mainEnemyTeam = game.players[mainEnemy].team.number;
}

//Get enemy buildings
//For whatever reason neutral buildings and goldmines get included so we gotta be careful of those
var enemyBuildings = getBuildings({enemyOf: myPlayerNumber});

//Set the main enemy as the enemy with a building closest to you
//This method of picking a target seems bad and I will change it later
var closestEnemyBuildingDist = 99999;
var closestEnemyBuilding = null;
if (myBuildings.length > 0) {
	var enemyBuildingDist = 0;
	for (var i = 0; i < enemyBuildings.length; i++) {
		enemyBuildingDist = distance(myBuildings[0].getX(), myBuildings[0].getY(), enemyBuildings[i].getX(), enemyBuildings[i].getY());
		if (enemyBuildingDist < closestEnemyBuildingDist && !enemyBuildings[i].isNeutral()) {
			closestEnemyBuildingDist = enemyBuildingDist;
			closestEnemyBuilding = enemyBuildings[i];
			mainEnemy = closestEnemyBuilding.getOwnerNumber();
			mainEnemyTeam = closestEnemyBuilding.getTeamNumber();
		}
	}
}

/**************************************
Constructing Castles
**************************************/
/*
Castle 1 conditions:
- We have enough gold to build a castle
- # of castles = 0
*/
if (gold >= CASTLECOST
	&& castles.length == 0) {
	constructCastle();
}

/*
Castle 2 conditions:
- We have enough gold to build a castle
- # of castles = 1
- # of barracks > 1
*/
if (gold >= CASTLECOST
	&& castles.length == 1
	&& barracks.length > 1) {
	constructCastle();
}

/*
Castle 3 conditions:
- We have enough gold to build a castle
- # of castles = 2
- # of barracks > 3
*/
if (gold >= CASTLECOST
	&& castles.length == 2
	&& barracks.length > 3) {
	constructCastle();
}

/**************************************
Constructing Houses
**************************************/
//First house is a special case (If you don't 2 workers will try to build houses at the start)
if (time == 1) {
	constructBuilding("House");
}

/*
Conditions for further houses:
- Past 30 seconds into the game
- We have enough gold to build a house
- We have less than 5 supply until we hit our cap
- We don't already have enough houses/castles for 100 supply
- There are no houses currently being built
- There are no castles currently being built
- We have at least one castle
*/
if (time > 30 
	&& gold >= HOUSECOST
	&& maxSupply - currentSupply < 5
	&& maxSupply < 100
	&& houses.length == finishedHouses.length
	&& castles.length == finishedCastles.length
	&& castles.length > 0) {
	constructBuilding("House");
}

/**************************************
Upgrading Units
**************************************/
//Forge Upgrades
for (var i = 0; i < finishedForges.length; i++) {
	if (finishedForges[i].getUnitTypeNameInProductionQueAt(1) == "Damage") {
		weaponUpgrade++;
	} else if (finishedForges[i].getUnitTypeNameInProductionQueAt(1) == "Armor") {
		armorUpgrade++;
	}
}
for (var i = 0; i < finishedForges.length; i++) {
	if (!finishedForges[i].getUnitTypeNameInProductionQueAt(1)) {
		if (weaponUpgrade > armorUpgrade && armorUpgrade < 5) {
			scope.order("Armor Upgrade", [finishedForges[i]]);
			armorUpgrade++;
		} else if (weaponUpgrade < 5) {
			scope.order("Attack Upgrade", [finishedForges[i]]);
			weaponUpgrade++;
		}
	}
}

//Mage Upgrades
if (finishedGuilds.length > 0 && mageHeal == 0) {
	if (!finishedGuilds[0].getUnitTypeNameInProductionQueAt(1)) {
		scope.order("Research Heal", [finishedGuilds[0]]);
	}
}
/*
if (finishedGuilds.length > 0 && mageHeal == 1 && mageFlame == 0) {
	if (!finishedGuilds[0].getUnitTypeNameInProductionQueAt(1)) {
		scope.order("Research Flamestrike", [finishedGuilds[0]]);
	}
}
*/

/**************************************
Training Units
**************************************/
//Training Workers (Min of 27 or my number of castles * 10)
var workerMax = Math.min(MAXWORKERS, (castles.length * 10));
for (var i = 0; i < finishedCastles.length; i++) {
	if (finishedCastles[i].getUnitTypeNameInProductionQueAt(1) == "Worker") {
		workerMax--;
	} 
}
for (var i = 0; i < castles.length; i++) {
	if (workers.length < workerMax && !castles[i].getUnitTypeNameInProductionQueAt(1)) {
		scope.order("Train Worker", [castles[i]]);
		workerMax--;
	}
}

//Training Soldiers and Riflemen to keep them even numbered
var numOfSoldiers = soldiers.length;
var numOfRiflemen = riflemen.length;
var numOfMages = mages.length;
for (var i = 0; i < finishedBarracks.length; i++) {
	if (finishedBarracks[i].getUnitTypeNameInProductionQueAt(1) == "Soldier") {
		numOfSoldiers++;
	} else if (finishedBarracks[i].getUnitTypeNameInProductionQueAt(1) == "Rifleman") {
		numOfRiflemen++;
	} else if (finishedBarracks[i].getUnitTypeNameInProductionQueAt(1) == "Mage") {
		numOfMages++;
	}
}
for (var i = 0; i < finishedBarracks.length; i++) {
	if (!finishedBarracks[i].getUnitTypeNameInProductionQueAt(1)) {
		var least = 0;
		if (guilds.length > 0 && mageHeal == 1) {
			least = Math.min(numOfSoldiers, numOfRiflemen, numOfMages);
		}
		else {
			least = Math.min(numOfSoldiers, numOfRiflemen);
		}
		if (least == numOfRiflemen) {
			scope.order("Train Rifleman", [finishedBarracks[i]]);
			numOfRiflemen++;
		} else if (least == numOfSoldiers) {
			scope.order("Train Soldier", [finishedBarracks[i]]);
			numOfSoldiers++;
		} else if (least == numOfMages) {
			scope.order("Train Mage", [finishedBarracks[i]]);
			numOfMages++;
		}
	}
}

/**************************************
Constructing Non-House or Non-Castle Buildings
**************************************/
/*
Barracks 1 and 2 conditions:
- We have enough gold to build a barracks
- # of finishedHouses > 0
- # of castles > 0
- # of barracks < 2
*/
if (gold >= BARRACKSCOST
	&& finishedHouses.length > 0
	&& castles.length > 0
	&& barracks.length < 2) {
	constructBuilding("Barracks");
}

/*
Barracks 3 and 4 conditions:
- We have enough gold to build a barracks
- # of finishedHouses > 0
- # of castles > 1
- # of barracks < 4
*/
if (gold >= BARRACKSCOST
	&& finishedHouses.length > 0
	&& castles.length > 1
	&& barracks.length < 4) {
	constructBuilding("Barracks");
}

/*
Barracks 5 and 6 conditions:
- We have enough gold to build a barracks
- # of finishedHouses > 0
- # of castles > 2
- # of barracks < 6
*/
if (gold >= BARRACKSCOST
	&& finishedHouses.length > 0
	&& castles.length > 2
	&& barracks.length < 6) {
	constructBuilding("Barracks");
}

/*
Barracks 7+ conditions:
- We have enough gold to build a barracks
- # of finishedHouses > 0
- # of castles > 2
- Damage upgrade = 5
- Armor upgrade = 5
*/
if (gold >= BARRACKSCOST
	&& finishedHouses.length > 0
	&& castles.length > 2
	&& (weaponUpgrade == 5 || gold >= 400)
	&& (armorUpgrade == 5 || gold >= 400)) {
	constructBuilding("Barracks");
}

/*
Mages Guild conditions:
- We have enough gold to build a guild
- # of castles > 1
- # of barracks > 1
- # of guilds == 0
*/
if (gold >= GUILDCOST
	&& castles.length > 1
	&& barracks.length > 1
	&& guilds.length == 0) {
	constructBuilding("Mages Guild");
}

/*
Forge 1 and 2 conditions:
- We have enough gold to build a forge
- # of castles > 2
- # of barracks > 3
- # of forges < 2
- Damage upgrade < 5 and Armor upgrade < 5
*/
if (gold >= FORGECOST
	&& castles.length > 2
	&& barracks.length > 3
	&& forges.length < 2
	&& (weaponUpgrade < 5 && armorUpgrade < 5)) {
	constructBuilding("Forge");
}

/**************************************
Controlling and Managing Workers
**************************************/
//Commanding idle workers to mine from nearest mine to them
//TODO: Make it closest mine with a castle
for (var i = 0; i < idleWorkers.length; i++) {
	var nearestMine = null;
	var nearestDist = 99999;
	for (var j = 0; j < mines.length; j++) {
		var dist = distance(idleWorkers[i].getX(), idleWorkers[i].getY(), mines[j].getX(), mines[j].getY());
		var mine = mines[j];
		if (dist < nearestDist) {
			nearestMine = mine;
			nearestDist = dist;
		}
	}
	scope.order("Mine", [idleWorkers[i]], {unit: nearestMine});
}

//Allowing only 10 workers per castle
for (var i = 0; i < castles.length; i++) {
	var workersNearCastle = 0;
	for (var j = 0; j < workers.length; j++) {
		if (distance(castles[i].getX(), castles[i].getY(), workers[j].getX(), workers[j].getY()) < WORKERCASTLEDIST) {
			workersNearCastle++;
			if (workersNearCastle > 10) {
				if (castles.length > i + 1) {
					scope.order("Moveto", [workers[j]], {unit: castles[i + 1]});
				} else {
					scope.order("Moveto", [workers[j]], {unit: castles[0]});
				}
			}
		}
	}
}

//Making workers defend themselves for early game
//TODO

/**************************************
Controlling Attacking Units
**************************************/
//Get my teams and my enemies team army's value
var myTeamArmyValue = getTeamArmyValue(myTeamNumber);
var enemyTeamArmyValue = getTeamArmyValue(mainEnemyTeam);

//For now just add towers and forts to the enemies army, this is lazy but it's better than my army suiciding
var enemyTeamTowers = getBuildings({type: "Watchtower", team: mainEnemyTeam});
var enemyTeamForts = getBuildings({type: "Fortress", team: mainEnemyTeam});

enemyTeamArmyValue += (enemyTeamTowers.length * TOWERVALUE) + (enemyTeamForts.length * FORTVALUE)

if (fightingUnits.length > 0 && closestEnemyBuilding != null) {
	//Defending
	//Get enemy units that we can see
	var enemyUnits = scope.getUnits({enemyOf: myPlayerNumber});
	//Order my units to attack in the center of those units
	if (enemyUnits.length > 0) {
		scope.order("AMove", fightingUnits, scope.getCenterOfUnits(enemyUnits));
	}
	//Attacking
	else if ((myTeamArmyValue > enemyTeamArmyValue && time > ATTACKTIME) || currentSupply > 94){
		scope.order("AMove", fightingUnits, {x: closestEnemyBuilding.getX(), y: closestEnemyBuilding.getY()});
	}
	//Resting
	else {
		if (myBuildings.length > 0) {
			//Find a nice resting spot
			var xPosition = closestEnemyBuilding.getX() - myBuildings[myBuildings.length - 1].getX();
			xPosition = xPosition * ARMYPOSITION;
			xPosition = xPosition + myBuildings[myBuildings.length - 1].getX();
			var yPosition = closestEnemyBuilding.getY() - myBuildings[myBuildings.length - 1].getY();
			yPosition = yPosition * ARMYPOSITION;
			yPosition = yPosition + myBuildings[myBuildings.length - 1].getY();
			
			scope.order("Move", fightingUnits, {x: xPosition, y: yPosition});
		}
	}
}
//Mages Heal
if (mages.length > 0 && mageHeal == 1) {
	for (var i = 0; i < fightingUnits.length; i++) {
		if (fightingUnits[i].getCurrentHP() <= fightingUnits[i].unit.type.hp - 50) {
			scope.order("Heal", mages, {unit: fightingUnits[i]});
		}
	}
}