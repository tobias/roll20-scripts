/*
 * Clears the initiative tracker and adds a round counter when the
 * tracker is opened.
 *
 * Source: https://github.com/tobias/roll20-scripts/blob/main/AddRoundCounter.js
 */

(function () {
  const getTurnOrder = function() {
    let to=Campaign().get("turnorder");
    to=(''===to ? '[]' : to);
    return JSON.parse(to);
  };

  const setTurnOrder = function(turnOrder) {
    Campaign().set({turnorder: JSON.stringify(turnOrder)});
  };

  const hasTurn = function(id) {
    return (_.filter(getTurnOrder(),function(turn){
      return id == turn.id;
    }).length != 0);
  };

  const addTurn = function(entry) {
    var turnorder = getTurnOrder();
    turnorder.push(entry);
    setTurnOrder(turnorder);
  };

  const clearTurnOrder= function() {
    setTurnOrder([]);
  };

  const counter = {
    id: "-1",
    pr:"0",
    custom:"Round counter",
    formula:"+1"
  };

  on("change:campaign:initiativepage", function() {
    if (Campaign().get('initiativepage') === true) {
      log("[AddRoundCounter] Init page loaded, clearing turn order");
      clearTurnOrder();
      if (!hasTurn(counter.id)) {
        log("[AddRoundCounter] Adding round counter");
        addTurn(counter);
      }
    }
  });
}());
