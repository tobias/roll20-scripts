/*
 * Clears the initiative tracker and adds a round counter when the
 * tracker is opened.
 *
 * Source: https://github.com/tobias/roll20-scripts/blob/main/AddRoundCounter.js
 */

const AddRoundCounter =
(function () {
  const _log = (msg) => {
    log("[AddRoundCounter] " + msg);
  };

  const getTurnOrder = () => {
    let to = Campaign().get("turnorder");
    to = ('' === to ? '[]' : to);
    return JSON.parse(to);
  };

  const setTurnOrder = (turnOrder) => {
    Campaign().set({turnorder: JSON.stringify(turnOrder)});
  };

  const hasTurn = (id) => {
    return (_.filter(getTurnOrder(), (turn) => {
      return id == turn.id;
    }).length != 0);
  };

  const addTurn = (entry) => {
    var turnorder = getTurnOrder();
    turnorder.push(entry);
    setTurnOrder(turnorder);
  };

  const clearTurnOrder = () => {
    setTurnOrder([]);
    _log("turn order cleared");
  };

  const counter = {
    id: "-1",
    pr:"0",
    custom:"Round counter",
    formula:"+1"
  };

  const ensureRoundCounter = () => {
    if (!hasTurn(counter.id)) {
      _log("adding round counter");
      addTurn(counter);
    }
  };

  const init = () => {
    on("change:campaign:initiativepage", () => {
      if (Campaign().get('initiativepage') === true) {
        _log("Init page loaded, clearing turn order");
        clearTurnOrder();
        ensureRoundCounter();
      }
    });

    on("ready", () => {
      _log("loaded");
    });
  };

  return {
    init: init,
    getRoundCount: () => {
      ensureRoundCounter();
      const c = _.find(getTurnOrder(), (turn) => counter.id === turn.id);
      return c.pr;
    }
  };
}());

AddRoundCounter.init();
