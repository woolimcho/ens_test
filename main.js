let ens = null;
let account = null;

window.addEventListener("load", async () => {
  // Modern dapp browsers...
  if (window.ethereum) {
    window.web3 = new Web3(ethereum);
    try {
      // Request account access if needed
      await ethereum.enable();
      init();
      // Acccounts now exposed
    } catch (error) {
      // User denied account access...
    }
  }
  // Legacy dapp browsers...
  else if (window.web3) {
    window.web3 = new Web3(web3.currentProvider);
    // Acccounts always exposed
    web3.eth.sendTransaction({
      /* ... */
    });
  }
  // Non-dapp browsers...
  else {
    alert(
      "Non-Ethereum browser detected. You should consider trying MetaMask!"
    );
  }
});

function init() {
  $("#span_address").html(web3.eth.accounts[0]);
  account = web3.eth.accounts[0];
  window.ethereum.on("accountsChanged", function(accounts) {
    account = accounts[0];
    $("#span_address").html(web3.eth.accounts[0]);
  });

  $.getJSON("ens.json", function(json) {
    abiDecoder.addABI(json);
    ens = web3.eth
      .contract(json)
      .at("0xfeb280a203edffa061684986dda8d5905e97e064");
  });
  var options = {
    fromBlock: "0x0",
    address: "0x0A22aBDfE9c05EaF2293b994F84d9fCF60029a9A"
  };
  var subscription = web3.eth.subscribe("logs", options, function(
    error,
    result
  ) {
    if (error || result == null) {
      console.log("Error when watching incoming transactions: ", error.message);
      return;
    }
    console.log("Got something back: ", result);
    // code continues...
  });
  subscription.on("data", function(log) {
    console.log(log);
  });
}

function getResultByLog(log) {
    console.log(log);
    if(log.name === 'AddressLogger') {
        return '<b>Result</b> ' + log.events[0].value;
    } else if(log.name === 'NameLogger') {
        return '<b>Result</b> ' + log.events[0].value;
    } else if(log.name === 'NotFoundLogger') {
        return '<b>Not Found</b>';
    } else if(log.name === 'ChangeAddressLogger') {
        return `<b>Success, changed address of (${log.events[0].value} from ${log.events[1].value} tp ${log.events[2].value}`;
    } else if(log.name === 'RegisterLogger') {
        return `<b>Success, registered domain(${log.events[0].value}, ${log.events[1].value})`;
    } else if(log.name === 'TransferLogger') {
        return `<b>Success, new owner of domain ${log.events[0].value} is ${log.events[1].value}`;
    }
    return '';
}

function getResult(receipt) {
    let logs = abiDecoder.decodeLogs(receipt.logs);
    let desc = "";
    for(let i = 0; i < logs.length; i++) {
        desc += getResultByLog(logs[i]);
    }
    return desc;
}

function addTransaction(txHash, description) {
    console.log(txHash, description);
    $('input').val('');
    let html = `<div id='txlist-${txHash}' class=\"alert alert-primary\" role=\"alert\"><b>${description}</b><br><div style="word-wrap: break-word;">txHash: ${txHash}</div><b><br><div class=\"res\">Pending <\/b><div class=\"spinner-border\" role=\"status\"><span class=\"sr-only\">Loading...<\/span><\/div><\/div><\/div>`;
    $('#transaction-list').prepend(html);
}

function txFailed(txHash) {
    let el = $(`#txlist-${txHash}`);
    el.removeClass('alert-primary');
    el.addClass('alert-danger');
    $(`#txlist-${txHash} .res`).html('<b>failed</b>');
}

function txSuccess(txHash, description) {
    let el = $(`#txlist-${txHash}`);
    el.removeClass('alert-primary');
    el.addClass('alert-success');
    console.log(description);
    $(`#txlist-${txHash} .res`).html(description);
}

function valid(name, address) {
  if (address != null && !web3.isAddress(address)) {
    alert("invalid address");
    return false;
  }
  if (name != null && name.length == 0) {
    alert("invalid domain name");
    return false;
  }
  return true;
}

async function handleTx(err, txHash) {
    console.log(err, txHash);
    if(!txHash) return;
    const receipt = await getTransactionReceipt(txHash);

    if (receipt.status == 0x0) {
      txFailed(txHash);
    } else {
      txSuccess(txHash, getResult(receipt));
    }
}

function register(name, address) {
  if (valid(name, address)) {
    ens.register(
      name,
      address,
      {
        from: account,
        value: 100000000000000000
      },
      (err, txHash) => {
        addTransaction(txHash, `Register(${name}, ${address})`);
        if(err) {
            txFailed(txHash);
        } else {
            handleTx(err, txHash);
        }
      }
    );
  }
}

function queryByName(name) {
  if (valid(name, null)) {
    ens.queryByDomain(
      name,
      {
        from: account,
        value: 10000000000000000
      },
      async (err, txHash) => {
        addTransaction(txHash, `QueryByName(${name})`);
        handleTx(err, txHash);
      }
    );
  }
}

function queryByAddress(address) {
  if (valid(null, address)) {
    ens.queryByAddress(
      address,
      {
        from: account,
        value: 10000000000000000
      },
      (err, txHash) => {
        addTransaction(txHash, `QueryByAddress(${address})`);
        handleTx(err, txHash);
      }
    );
  }
}

function changeAddress(name, address) {
  if (valid(name, address)) {
    ens.changeAddress(
      name,
      address,
      {
        from: account,
        value: 100000000000000000
      },
      (err, txHash) => {
        addTransaction(txHash, `changeAddress(${name}, ${address})`);
        handleTx(err, txHash);
      }
    );
  }
}

function transferNameOwnership(name, newOwner) {
  if (valid(name, newOwner)) {
    ens.transferNameOwnership(
      name,
      newOwner,
      {
        from: account,
        value: 100000000000000000
      },
      (err, txHash) => {
        addTransaction(txHash, `transferNameOwnership(${name}, ${newOwner})`);
        handleTx(err, txHash);
      }
    );
  }
}

function withdraw(eth) {
  console.log(eth);
  ens.withdraw(
    Number(eth) * 1000000000000000000,
    {
      from: account,
    },
    (err, txHash) => {
      addTransaction(txHash, `withdraw(${eth} ether)`);
      handleTx(err, txHash);
    }
  );
}

function destruct() {
  ens.destruct(
    {
      from: account
    },
    (err, txHash) => {
      addTransaction(txHash, 'destruct');
      handleTx(err, txHash);
    }
  );
}

const getTransactionReceipt = async hash => {
  let receipt = null;
  while (receipt === null) {
    receipt = await getTransactionReceiptPromise(hash);
    await new Promise(x => setTimeout(x, 1000));
  }
  return receipt;
};

function getTransactionReceiptPromise(hash) {
  return new Promise((resolve, reject) => {
    web3.eth.getTransactionReceipt(hash, function(err, data) {
      if (err !== null) reject(err);
      else resolve(data);
    });
  });
}