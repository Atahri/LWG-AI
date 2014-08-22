/*
LWG AI
Authors: 
	TolZ 1.0 to 1.01
	Atahri 1.01 to 1.02

For LWG Version: 1.9
AI Version: 1.02
Version Release Date: Aug 22, 2014

Planned:
- Workers choose construction location based on their own location (preference closer candidates)
- Wolves, dragons, catapults
- Detection of choke points, for blocking/defending
- Attack neutral to avoid towers
- Defend against some cheeses (wolf + cat and castle blocking)
- Better castle placement algorithm (more versatile for different maps)
- Choose nicer resting locations
- Detect choke points
- Combat units will move along the correct path to an enemy (if enemy blocks themselves in.
- Ranged units will stagger step away from chasing enemies

New in 1.02:
- Workers will try to defend themselves enemies are near them
- Workers will run at low health
- Interrupted builds will now be completed
- Units will focus low health targets
- Workers will no longer try to mine depleted mines
- Workers shouldn't try to mine from goldmines without a castle as often
- Bugfix: Castle placement to the right is now within the bounds of the isBuildable check
- Bugfix: Stop units from blocking one another from building something that they've both got queued up (works most of the time)
- Bugfix: workers no longer confused when one mine is the closest mine to two castles
- Bugfix: non-ranged units will no longer try to attack flying units
- Bugfix: barracks will be continue to be built into late game
- Bugfix: towers will no longer deter AI as much
- Bugfix: army no longer retreats if it's not close enough when another unit is encountered 

New in 1.01:
- Everything
*/



var MAXWORKERS = 27; // Maximum number of workers we ever need
var WORKERMINEDIST = 10; // Used to determine maximum distance for a worker to be worked by a mine
var MINEDIST = 5; // Used to keep buildings from blocking goldmines
var ATTACKTIME = 120; // Earliest time the AI will attack
var WORKERSPERMINE = 8; // Most workers per mine (mostly for debugging)

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

var TOWERVALUE = 6;
var FORTVALUE = 10;

var ARMYPOSITION = 0.15;

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

	var forgeBuilders = scope.getUnits({type: "Worker", order: "Build Forge", player: myPlayerNumber});
	if (forgeBuilders.length > 1){
		scope.order("Stop", [forgeBuilders[1]]);
	}
	var watchtowerBuilders = scope.getUnits({type: "Worker", order: "Build Watchtower", player: myPlayerNumber});
	if (watchtowerBuilders.length > 1){
		scope.order("Stop", [watchtowerBuilders[1]]);
	}
	
	var barracksBuilders = scope.getUnits({type: "Worker", order: "Build Barracks", player: myPlayerNumber});
	if (barracksBuilders.length > 1){
		scope.order("Stop", [barracksBuilders[1]]);
	}
	var castleBuilders = scope.getUnits({type: "Worker", order: "Build Castle", player: myPlayerNumber});
	if (castleBuilders.length > 1){
		scope.order("Stop", [castleBuilders[1]]);
	}
	var houseBuilders = scope.getUnits({type: "Worker", order: "Build House", player: myPlayerNumber});
	if (houseBuilders.length > 1){
		scope.order("Stop", [houseBuilders[1]]);
	}
	var guildBuilders = scope.getUnits({type: "Worker", order: "Build Mages Guild", player: myPlayerNumber});
	if (guildBuilders.length > 1){
		scope.order("Stop", [guildBuilders[1]]);
	}
	var numBuilders = forgeBuilders.length + watchtowerBuilders.length + barracksBuilders.length + castleBuilders.length + houseBuilders.length + guildBuilders.length;

	var finishedBuildings = scope.getBuildings({player:myPlayerNumber, onlyFinshed: true});
	var allBuildings = scope.getBuildings({player:myPlayerNumber, onlyFinshed: false});
	
	if (numBuilders > (allBuildings.length - finishedBuildings.length)){
		// console.log("Shouldn't build now!")
		return; // don't try to build one thing twice at the same time - removes bad behaviour
	}
	// console.log("Building " + newBuilding);

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
	for (var i = 0; i < finishedBuildings.length; i++) {
		buildingX = finishedBuildings[i].getX() | 0; // bitwise or 0 is for fast truncate
		buildingY = finishedBuildings[i].getY() | 0;
		closestMine = findClosest(finishedBuildings[i], mines);
		if (finishedBuildings[i].getTypeName() == "Castle" || finishedBuildings[i].getTypeName() == "Forge") {
			buildingX--;
			buildingY--;
			buildingLength = 4;
			buildingWidth = 4;
		} else if (finishedBuildings[i].getTypeName() == "House" || finishedBuildings[i].getTypeName() == "Barracks" || finishedBuildings[i].getTypeName() == "Mages Guild") {
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
var constructCastle = function(skip) {
	var myPlayerNumber = scope.getMyPlayerNumber();
	var myBuildings = scope.getBuildings({player: myPlayerNumber});
	var workers = scope.getUnits({type: "Worker", order: "Mine", player: myPlayerNumber});
	var mines = scope.getBuildings({type: "Goldmine"});
	if (skip && skip > mines.length){
		return;
	}
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
	var skipper = skip;
	if (myBuildings.length > 0) {
		//Sorted list of Goldmine distance from one of my buildings
		minesToBuilding = sortDistance(myBuildings[0], mines);
		for (var i = 0; i < minesToBuilding.length; i++) {
			suitableMine = true;
			for (var j = 0; j < allCastlesAndForts.length; j++) {
				dist = distance(minesToBuilding[i].getX(), minesToBuilding[i].getY(), allCastlesAndForts[j].getX(), allCastlesAndForts[j].getY());
				if (dist <= 10 && minesToBuilding[i].unit.gold > 500) {
					suitableMine = false;
				}
			}
			if (suitableMine) {
				if (!skipper || skipper == 0){
					theGoldmine = minesToBuilding[i];
					break;
				}
				else {
					skipper--;
				}
			}
		}
	} 
	if (theGoldmine != null) {
		theGoldmineX = parseInt(theGoldmine.getX());
		theGoldmineY = parseInt(theGoldmine.getY());
		
		//Above
		if (isBuildable(theGoldmineX - 1, theGoldmineY - 9, theGoldmineX + 2, theGoldmineY - 1)) {
			// console.log(1);
			newCastleX = theGoldmineX - 1;
			newCastleY = theGoldmineY - 9;
		} else if (isBuildable(theGoldmineX, theGoldmineY - 9, theGoldmineX + 3, theGoldmineY - 1)) {
			// console.log(2);
			newCastleX = theGoldmineX;
			newCastleY = theGoldmineY - 9;
		}
		//Below
		else if (isBuildable(theGoldmineX - 1, theGoldmineY + 3, theGoldmineX + 2, theGoldmineY + 11)) {
			// console.log(3);
			newCastleX = theGoldmineX - 1;
			newCastleY = theGoldmineY + 8;
		} else if (isBuildable(theGoldmineX, theGoldmineY + 3, theGoldmineX + 3, theGoldmineY + 11)) {
			// console.log(4);
			newCastleX = theGoldmineX;
			newCastleY = theGoldmineY + 8;
		}
		//Left
		else if (isBuildable(theGoldmineX - 9, theGoldmineY - 1, theGoldmineX - 1, theGoldmineY + 2)) {
			// console.log(5);
			newCastleX = theGoldmineX - 9;
			newCastleY = theGoldmineY - 1;
		} else if (isBuildable(theGoldmineX - 9, theGoldmineY, theGoldmineX - 1, theGoldmineY + 3)) {
			// console.log(6);
			newCastleX = theGoldmineX - 9;
			newCastleY = theGoldmineY;
		}
		//Right
		else if (isBuildable(theGoldmineX + 3, theGoldmineY - 1, theGoldmineX + 11, theGoldmineY + 2)) {
			// console.log(7);
			newCastleX = theGoldmineX + 8;
			newCastleY = theGoldmineY - 1 ;
		} else if (isBuildable(theGoldmineX + 3, theGoldmineY, theGoldmineX + 11, theGoldmineY + 3)) {
			// console.log(8);
			newCastleX = theGoldmineX + 8;
			newCastleY = theGoldmineY;
		}
		
		if (newCastleX != null) {
			scope.order("Build Castle", workers, {x: newCastleX, y: newCastleY});
			// console.log("Castle built for:");
			// console.log(theGoldmine);
		}
		else {
			// console.log("Castle failed");
			constructCastle(1+(skip || 0));
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
var myFinishedBuildings = scope.getBuildings({player: myPlayerNumber, onlyFinshed: true});


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
var miners = scope.getUnits({type: "Worker", order: "Mine", player: myPlayerNumber});
var builders = scope.getUnits({type: "Worker", order: "Moveto", player: myPlayerNumber});
var attackingWorkers = scope.getUnits({type: "Worker", order: "Attack", player: myPlayerNumber});
var idleWorkers = scope.getUnits({type: "Worker", player: myPlayerNumber, order: "Stop"});
var soldiers = scope.getUnits({type: "Soldier", player: myPlayerNumber});
var riflemen = scope.getUnits({type: "Rifleman", player: myPlayerNumber});
var mages = scope.getUnits({type: "Mage", player: myPlayerNumber});
var fightingUnits = scope.getUnits({notOfType: "Worker", player: myPlayerNumber});
var attackingUnits = scope.getUnits({order: "Attack", player: myPlayerNumber});
var attackMovingUnits = scope.getUnits({order: "AMove", player: myPlayerNumber});

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
Constructing Houses
**************************************/
//First house is a special case (If you don't 2 workers will try to build houses at the start)
// if (time == 1 && houses.length == 0) {
// 	constructBuilding("House");
// }

/*
Conditions for further houses:
- Past 30 seconds into the game
- We have enough gold to build a house
- We have less than 5 supply until we hit our cap
- We don't already have enough houses/castles for 100 supply
- There are no houses currently being built
- //There are no castles currently being built
- We have at least one castle
*/
if (gold >= HOUSECOST
	&& maxSupply - currentSupply < 5
	&& maxSupply < 100
	&& houses.length == finishedHouses.length
	&& houses.length <= 6
	&& castles.length > 0) {
	constructBuilding("House");
}

/**************************************
Constructing Castles
**************************************/
/*
	Castle conditions:
	- We have enough gold to build a castle
	- # of castles is 0, requires no barracks
	- # of castles is 1, requires barracks >= 2
	- # of castles is 2, requires barracks >= 4
	- # of castles is 3, requires barracks >= 6
	ratio is 2*castles
*/

if (gold >= CASTLECOST){
	if (castles.length * 2 <= barracks.length) {
		constructCastle();
	}
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
var workerMax = Math.min(MAXWORKERS, (finishedCastles.length * 10));
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

//Ratio of 5 rifles to 4 soldiers and 4 mages
var numOfSoldiers = soldiers.length*5;
var numOfRiflemen = riflemen.length*4;
var numOfMages = mages.length*5;
for (var i = 0; i < finishedBarracks.length; i++) {
	if (finishedBarracks[i].getUnitTypeNameInProductionQueAt(1) == "Soldier") {
		numOfSoldiers+=5;
	} else if (finishedBarracks[i].getUnitTypeNameInProductionQueAt(1) == "Rifleman") {
		numOfRiflemen+=4;
	} else if (finishedBarracks[i].getUnitTypeNameInProductionQueAt(1) == "Mage") {
		numOfMages+=5;
	}
}
for (var i = 0; i < finishedBarracks.length && (barracks >= 2 || time > 120); i++) {
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
Barracks conditions:
 - We have enough gold to build a barracks
 - # of finishedHouses > 0
if num barracks == 6, wait for upgrades or a stack of goldmines: 
 - Damage upgrade = 5
 - Armor upgrade = 5
*/
if (gold >= BARRACKSCOST
	&& finishedHouses.length > 0
	&& (castles.length *2 > barracks.length || gold >= 600)
	&& (barracks.length < 6 || (weaponUpgrade == 5 && armorUpgrade == 5) || gold >= 400)) {
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
	&& castles.length >= 2 + forges.length
	&& barracks.length > forges.length + 1
	&& (10 - (weaponUpgrade + armorUpgrade) > forges.length - 1)) { // better approximation than both < 5
	constructBuilding("Forge");
}

/**************************************
Controlling and Managing Workers
**************************************/
//Commanding idle workers to mine from nearest mine to the nearest castle as long as it has gold
for (var i = 0; i < idleWorkers.length; i++) {
	var nearestCastle = null;
	var castleDist = 99999;
	for (var j = 0; j < castles.length; j++){
		var dist = distance(castles[j].getX(), castles[j].getY(), idleWorkers[i].getX(), idleWorkers[i].getY());
		var castle = castles[j];
		if (dist < castleDist){
			nearestCastle = castle;
			castleDist = dist;
		}
	}
	if (time > 100 && myBuildings.length > myFinishedBuildings.length && miners.length + idleWorkers.length == workers.length){
		
		for (var j = 0; j < myBuildings.length; j++){
			if (myBuildings[j].unit.isUnderConstruction){
		 		scope.order("Moveto", [idleWorkers[i]], {unit: myBuildings[j]});
	    		myBuildings[j].isUnderConstruction = false;
	    		break;
			}
	 	}
	}
	else if (castleDist > 11 && nearestCastle != null){
		scope.order("Moveto", [idleWorkers[i]], {unit: nearestCastle});
	}
	else if (nearestCastle != null) {
		var nearestMine = null;
		var nearestDist = 99999;
		for (var j = 0; j < mines.length; j++) {
			var dist = distance(nearestCastle.getX(), nearestCastle.getY(), mines[j].getX(), mines[j].getY());
			var mine = mines[j];
			if (dist < nearestDist && mine.unit.gold > 5) {
				nearestMine = mine;
				nearestDist = dist;
			}
		}
		scope.order("Mine", [idleWorkers[i]], {unit: nearestMine});
	}
}

for (var i = 0; i < mines.length; i++){
	var nearestDist = 99999;
	for (var j = 0; j < castles.length; j++){
		var dist =distance(mines[i].getX(), mines[i].getY(), castles[j].getX(), castles[j].getY());
		if (dist < nearestDist){
			nearestDist = dist;
		}
	}
	mines[i].owned = false;
	if (nearestDist < 11 && mines[i].unit.gold > 0){
		mines[i].owned = true;
	}
}
var minersToMove = [];
var fullMines = [];
if (castles.length > 0){
	for (var i = 0; i < miners.length; i++) {
		miners[i].unit.targetUnit.workers = 0;
	}

	for (var i = 0; i < miners.length; i++) {
		fullMines[miners[i].unit.targetUnit.id] = false;
		miners[i].unit.targetUnit.workers++;
		if (miners[i].unit.targetUnit.workers > WORKERSPERMINE){
			minersToMove.push(miners[i]);
			fullMines[miners[i].unit.targetUnit.id] = true;
		}
	}


	if (minersToMove.length > 0){
		for (var j = 0; j < mines.length; j++){
			if (fullMines[mines[j].unit.id]){
				continue;
			}
			if (mines[j].owned){
				scope.order("Mine", minersToMove, {unit: mines[j]});
				break;
			}
		}
	}
}

//Making workers defend themselves for early game
var enemyUnits = scope.getUnits({enemyOf: myPlayerNumber});
for (var i=0; i < workers.length; i++){
	var nearestEnemy = null;
	var nearestDist = 99999;
	var lowestHp = 999;
	var bestTarget = null;
	for (var j = 0; j < enemyUnits.length;j++){
		var enemyDist = distance(workers[i].getX(), workers[i].getY(), enemyUnits[j].getX(), enemyUnits[j].getY());
		var hp = enemyUnits[j].unit.hp;
		if (enemyDist < nearestDist && !enemyUnits[j].unit.type.flying){
			nearestEnemy = enemyUnits[j];
			nearestDist = enemyDist;
		}
		if (hp < lowestHp && enemyDist < 2 && hp < workers[i].unit.hp){
			lowestHp = hp;
			bestTarget = enemyUnits[i];
		}

	}
	if (bestTarget != null){
		scope.order("Attack", [workers[i]], {unit: bestTarget});
	}
	else if (nearestEnemy != null && nearestDist <= Math.max(nearestEnemy.getFieldValue("range")+1, 5)  && workers[i].unit.hp * 1.0 / workers[i].getFieldValue("hp") >= nearestEnemy.unit.hp * 0.5 / nearestEnemy.getFieldValue("hp")){ 
		scope.order("Attack", [workers[i]], {unit: nearestEnemy});
	}
	else if (nearestEnemy == null){
		for (var j = 0; j < enemyBuildings.length;j++){
			var enemyDist = distance(workers[i].getX(), workers[i].getY(), enemyBuildings[j].getX(), enemyBuildings[j].getY());
			if (enemyDist < nearestDist){
				nearestEnemy = enemyBuildings[j];
				nearestDist = enemyDist;
			}
		}
		if (nearestDist <= 7){
			scope.order("Attack", [workers[i]], {unit: nearestEnemy});
		}
	}
}

// Retreat mechanism for wounded workers
for (var i=0; i < workers.length;i++){
	var closestCastle = null;
	var castleDist = 99999;
	for (var j=0;j<castles.length;j++){
		var dist = distance(workers[i].getX(), workers[i].getY(), castles[j].getX(), castles[j].getY());
		if (dist < castleDist){
			castleDist = dist;
			closestCastle = castles[j];
		}
	}
	var nearestEnemy = null;
	var nearestDist = 99999;
	for (var j = 0; j < enemyUnits.length;j++){
		var enemyDist = distance(workers[i].getX(), workers[i].getY(), enemyUnits[j].getX(), enemyUnits[j].getY());
		if (enemyDist < nearestDist){
			nearestEnemy = enemyUnits[j];
			nearestDist = enemyDist;
		}
	}
	if (castleDist > 11 && nearestDist < 8 && !(workers[i].unit.targetUnit != null && workers[i].unit.hp / workers[i].unit.targetUnit.hp >= 3)){ // don't chase too deep with workers unless you're winning by far!
		scope.order("Moveto", [workers[i]], {unit:closestCastle});
	}
	else {
		var nearestEnemy = null;
		var nearestDist = 99999;
		for (var j = 0; j < enemyUnits.length;j++){
			var enemyDist = distance(workers[i].getX(), workers[i].getY(), enemyUnits[j].getX(), enemyUnits[j].getY());
			if (enemyDist < nearestDist){
				nearestEnemy = enemyUnits[j];
				nearestDist = enemyDist;
			}
		}
		// the distance they are apart is the distance your unit moves away, in the opposite direction
		if (nearestDist <= 9 && nearestEnemy.unit.hp >= workers[i].unit.hp * 2) {
			var dx =  workers[i].getX() - (nearestEnemy.getX() - workers[i].getX())*2;
			var dy = workers[i].getY() - (nearestEnemy.getY() - workers[i].getY())*2;
			if (isBuildable(Math.floor(dx),Math.floor(dy),Math.ceil(dx),Math.ceil(dy))) { // worker not trapped
				scope.order("Move", [workers[i]], {x: dx, y: dy });
			}
			else {
				scope.order("Attack", [workers[i]], {unit: nearestEnemy });	
			}
		}
	}
}

/**************************************
Controlling Attacking Units
**************************************/
//Get my teams and my enemies team army's value
var myTeamArmyValue = getTeamArmyValue(myTeamNumber);
var enemyTeamArmyValue = getTeamArmyValue(mainEnemyTeam);

//For now just add towers and forts to the enemies army, this is lazy but it's better than my army suiciding
var enemyTeamTowers = getBuildings({type: "Watchtower", team: mainEnemyTeam});
var enemyTeamForts = getBuildings({type: "Fortress", team: mainEnemyTeam});
var enemyTeamBarracks = getBuildings({type: "Barracks", team: mainEnemyTeam});

enemyTeamArmyValue += (enemyTeamTowers.length * TOWERVALUE) + (enemyTeamForts.length * FORTVALUE) + enemyTeamBarracks.length;

if (fightingUnits.length > 0 && closestEnemyBuilding != null) {
	//Defending
	//Get enemy units that we can see
	//aim at the lowest hp target in range, or amove to the closest
	if (enemyUnits.length > 0) {
		for (var i = 0; i < fightingUnits.length; i++) {
			var bestTarget = null;
			var lowestHp = 999;
			var closestEnemy = null;
			var closestDist = 99999;
			var kiteUnit = null;
			var kiteDistance = 99999;
			for (var j = 0; j < enemyUnits.length; j++){
				var hp = enemyUnits[j].unit.hp;
				var distToEnemy = distance(fightingUnits[i].getX(), fightingUnits[i].getY(), enemyUnits[j].getX(), enemyUnits[j].getY());
				if (enemyUnits[j].unit.targetUnit != null && enemyUnits[j].unit.targetUnit.id == fightingUnits[i].unit.id && distToEnemy <= kiteDistance){
					kiteUnit = enemyUnits[j];
					kiteDistance = distToEnemy;
				}
				if (hp < lowestHp && distToEnemy <= fightingUnits[i].getFieldValue("range") + 1 && (!enemyUnits[j].unit.type.flying || (fightingUnits[i].getFieldValue("range") >= 3))) {
					lowestHp = hp;
					bestTarget = enemyUnits[j];
				}	
				if (distToEnemy < closestDist){
					closestDist = distToEnemy;
					closestEnemy = enemyUnits[i];
				}
			}

			//replace hp with number of hits to take down and rate of fire
			if (kiteUnit != null && kiteUnit.unit.targetUnit.hp >= fightingUnits[i].unit.hp * 1.5 && fightingUnits[i].getFieldValue("range") > Math.max(kiteUnit.getFieldValue("range"),2) && kiteDistance < Math.abs(fightingUnits[i].getFieldValue("range") - 3)){
				scope.order("Move", [fightingUnits[i]], {x: fightingUnits[i].getX() - (kiteUnit.getX() - fightingUnits[i].getX())*2, y:  fightingUnits[i].getY() - (kiteUnit.getY() - fightingUnits[i].getY())*2}); // kiting
			} else if (fightingUnits[i].unit.blocking && fightingUnits[i].getFieldValue("range") > 4){
				scope.order("Move", [fightingUnits[i]], {unit: bestTarget}); // move out of the way of friendlies
			} else if (bestTarget != null){
				scope.order("Attack", [fightingUnits[i]], {unit: bestTarget});
			}
			else if (closestDist < 30){
				scope.order("AMove", [fightingUnits[i]], scope.getCenterOfUnits(enemyUnits));
			}
			else if ((myTeamArmyValue > enemyTeamArmyValue && time > ATTACKTIME) || currentSupply > 94){
				scope.order("AMove", [fightingUnits[i]], {x: closestEnemyBuilding.getX(), y: closestEnemyBuilding.getY()});
			}
			else { //resting
				if (myBuildings.length > 0) {
					//Find a nice resting spot
					var xPosition = closestEnemyBuilding.getX() - myBuildings[myBuildings.length - 1].getX();
					xPosition = xPosition * (ARMYPOSITION - 0.03);
					xPosition = xPosition + myBuildings[myBuildings.length - 1].getX();
					var yPosition = closestEnemyBuilding.getY() - myBuildings[myBuildings.length - 1].getY();
					yPosition = yPosition * (ARMYPOSITION - 0.03);
					yPosition = yPosition + myBuildings[myBuildings.length - 1].getY();
					
					scope.order("AMove", mages, {x: xPosition, y: yPosition});

					var xPosition = closestEnemyBuilding.getX() - myBuildings[myBuildings.length - 1].getX();
					xPosition = xPosition * (ARMYPOSITION + 0.02);
					xPosition = xPosition + myBuildings[myBuildings.length - 1].getX();
					var yPosition = closestEnemyBuilding.getY() - myBuildings[myBuildings.length - 1].getY();
					yPosition = yPosition * (ARMYPOSITION + 0.02);
					yPosition = yPosition + myBuildings[myBuildings.length - 1].getY();
					scope.order("AMove", soldiers, {x: xPosition, y: yPosition});

					var xPosition = closestEnemyBuilding.getX() - myBuildings[myBuildings.length - 1].getX();
					xPosition = xPosition * ARMYPOSITION;
					xPosition = xPosition + myBuildings[myBuildings.length - 1].getX();
					var yPosition = closestEnemyBuilding.getY() - myBuildings[myBuildings.length - 1].getY();
					yPosition = yPosition * ARMYPOSITION;
					yPosition = yPosition + myBuildings[myBuildings.length - 1].getY();
					scope.order("AMove", riflemen, {x: xPosition, y: yPosition});
				}
			}
		};
		
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
			xPosition = xPosition * (ARMYPOSITION - 0.03);
			xPosition = xPosition + myBuildings[myBuildings.length - 1].getX();
			var yPosition = closestEnemyBuilding.getY() - myBuildings[myBuildings.length - 1].getY();
			yPosition = yPosition * (ARMYPOSITION - 0.03);
			yPosition = yPosition + myBuildings[myBuildings.length - 1].getY();
			scope.order("AMove", mages, {x: xPosition, y: yPosition});

			var xPosition = closestEnemyBuilding.getX() - myBuildings[myBuildings.length - 1].getX();
			xPosition = xPosition * (ARMYPOSITION + 0.02);
			xPosition = xPosition + myBuildings[myBuildings.length - 1].getX();
			var yPosition = closestEnemyBuilding.getY() - myBuildings[myBuildings.length - 1].getY();
			yPosition = yPosition * (ARMYPOSITION + 0.02);
			yPosition = yPosition + myBuildings[myBuildings.length - 1].getY();
			scope.order("AMove", soldiers, {x: xPosition, y: yPosition});

			var xPosition = closestEnemyBuilding.getX() - myBuildings[myBuildings.length - 1].getX();
			xPosition = xPosition * ARMYPOSITION;
			xPosition = xPosition + myBuildings[myBuildings.length - 1].getX();
			var yPosition = closestEnemyBuilding.getY() - myBuildings[myBuildings.length - 1].getY();
			yPosition = yPosition * ARMYPOSITION;
			yPosition = yPosition + myBuildings[myBuildings.length - 1].getY();
			scope.order("AMove", riflemen, {x: xPosition, y: yPosition});
		}
	}
}

//Mages Heal
for (var i=0; i<mages.length && mageHeal == 1; i++){
	for (var j = 0; j < fightingUnits.length; j++) {
		if (fightingUnits[j].getCurrentHP() <= fightingUnits[j].unit.type.hp - 50 && distance(fightingUnits[j].getX(), fightingUnits[j].getY(), mages[i].getX(), mages[i].getY()) < mages[i].getFieldValue("range")+2) {
			scope.order("Heal", [mages[i]], {unit: fightingUnits[j]});
		}
	}
}