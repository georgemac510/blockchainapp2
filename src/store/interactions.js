import Web3 from 'web3'
import {
  web3Loaded,
  web3AccountLoaded,
  tokenLoaded,
  exchangeLoaded,
  cancelledOrdersLoaded,
  filledOrdersLoaded,
  allOrdersLoaded,
  orderCancelling,
  orderCancelled,
  orderFilling,
  orderFilled,
  etherBalanceLoaded,
  tokenBalanceLoaded,
  exchangeEtherBalanceLoaded,
  exchangeTokenBalanceLoaded,
  balancesLoaded,
  balancesLoading,
  buyOrderMaking,
  sellOrderMaking,
  orderMade,
  metamaskChecked
} from './actions'
import Token from '../abis/Token.json'
import Exchange from '../abis/Exchange.json'
import { ETHER_ADDRESS } from '../helpers'

export const checkMetamask = (web3, dispatch) => {
  // Evaluates to true if window.web3 exists
  let metamaskInstalled = (typeof window.ethereum !== 'undefined')
  dispatch(metamaskChecked(metamaskInstalled))
  return metamaskInstalled
}

export const loadWeb3 = async (dispatch) => {
  let web3
  if (window.ethereum) {
    web3 = new Web3(window.ethereum)
    await window.eth_requestAccounts
  }
  else if (window.web3) {
    web3 = new Web3(window.web3.currentProvider)
  }
  else {
    // Do nothing....
  }
  dispatch(web3Loaded(web3))
  return web3
}

export const loadAccount = async (web3, dispatch) => {
  const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });

  const account = web3.utils.toChecksumAddress(accounts[0])

  dispatch(web3AccountLoaded(account))
  
  return account
}

export const loadToken = async (web3, networkId, dispatch) => {
  try {
    const token = new web3.eth.Contract(Token.abi, Token.networks[networkId].address)
    dispatch(tokenLoaded(token))
    return token
  } catch (error) {
    console.log('Contract not deployed to the current network. Please select another network with Metamask.')
    return null
  }
}

export const loadExchange = async (web3, networkId, dispatch) => {
  try {
    const exchange = new web3.eth.Contract(Exchange.abi, Exchange.networks[networkId].address)
    dispatch(exchangeLoaded(exchange))
    return exchange
  } catch (error) {
    console.log('Contract not deployed to the current network. Please select another network with Metamask.')
    return null
  }
}

export const loadAllOrders = async (exchange, dispatch) => {
  // Fetch cancelled orders with the "Cancel" event stream
  const cancelStream = await exchange.getPastEvents('Cancel', { fromBlock: 0, toBlock: 'latest' })
  // Format cancelled orders
  const cancelledOrders = cancelStream.map((event) => event.returnValues)
  // Add cancelled orders to the redux store
  dispatch(cancelledOrdersLoaded(cancelledOrders))

  // Fetch filled orders with the "Trade" event stream
  const tradeStream = await exchange.getPastEvents('Trade', { fromBlock: 0, toBlock: 'latest' })
  // Format filled orders
  const filledOrders = tradeStream.map((event) => event.returnValues)
  // Add cancelled orders to the redux store
  dispatch(filledOrdersLoaded(filledOrders))

  // Load order stream
  const orderStream = await exchange.getPastEvents('Order', { fromBlock: 0,  toBlock: 'latest' })
  // Format order stream
  const allOrders = orderStream.map((event) => event.returnValues)
  // Add open orders to the redux store
  dispatch(allOrdersLoaded(allOrders))
}

export const subscribeToEvents = async (exchange, dispatch) => {
  exchange.events.Cancel({}, (error, event) => {
    dispatch(orderCancelled(event.returnValues))
  })

  exchange.events.Trade({}, (error, event) => {
    dispatch(orderFilled(event.returnValues))
  })

  exchange.events.Deposit({}, (error, event) => {
    dispatch(balancesLoaded())
  })

  exchange.events.Withdraw({}, (error, event) => {
    dispatch(balancesLoaded())
  })

  exchange.events.Order({}, (error, event) => {
    dispatch(orderMade(event.returnValues))
  })
}

export const cancelOrder = (dispatch, exchange, order, account) => {
  exchange.methods.cancelOrder(order.id).send({ from: account })
  .on('transactionHash', (hash) => {
     dispatch(orderCancelling())
  })
  .on('confirmation', (confirmationNumber, receipt) => {
    if(confirmationNumber.toString() === '3') {
      window.location.reload()
    }
  })
  .on('error', (error) => {
    console.log(error)
    window.alert('There was an error!')
    window.location.reload()
  })
}

export const fillOrder = (dispatch, exchange, order, account) => {
  exchange.methods.fillOrder(order.id).send({ from: account })
  .on('transactionHash', (hash) => {
     dispatch(orderFilling())
  })
  .on('confirmation', (confirmationNumber, receipt) => {
    if(confirmationNumber.toString() === '3') {
      window.location.reload()
    }
  })
  .on('error', (error) => {
    console.log(error)
    window.alert('There was an error!')
    window.location.reload()
  })
}

export const loadBalances = async (dispatch, web3, exchange, token, account) => {
  // Ether balance in wallet
  const etherBalance = await web3.eth.getBalance(account)
  dispatch(etherBalanceLoaded(etherBalance))

  // Token balance in wallet
  const tokenBalance = await token.methods.balanceOf(account).call()
  dispatch(tokenBalanceLoaded(tokenBalance))

  // Ether balance in exchange
  const exchangeEtherBalance = await exchange.methods.balanceOf(ETHER_ADDRESS, account).call()
  dispatch(exchangeEtherBalanceLoaded(exchangeEtherBalance))

  // Token balance in exchange
  const exchangeTokenBalance = await exchange.methods.balanceOf(token.options.address, account).call()
  dispatch(exchangeTokenBalanceLoaded(exchangeTokenBalance))

  // Trigger all balances loaded
  dispatch(balancesLoaded())
}

export const depositEther = (dispatch, exchange, web3, amount, account) => {
  exchange.methods.depositEther().send({ from: account,  value: web3.utils.toWei(amount, 'ether') })
  .on('transactionHash', (hash) => {
    dispatch(balancesLoading())
  })
  .on('confirmation', (confirmationNumber, receipt) => {
    if(confirmationNumber.toString() === '3') {
      window.location.reload()
    }
  })
  .on('error',(error) => {
    console.error(error)
    window.alert(`There was an error!`)
    window.location.reload()
  })
}

export const withdrawEther = (dispatch, exchange, web3, amount, account) => {
  exchange.methods.withdrawEther(web3.utils.toWei(amount, 'ether')).send({ from: account })
  .on('transactionHash', (hash) => {
    dispatch(balancesLoading())
  })
  .on('confirmation', (confirmationNumber, receipt) => {
    if(confirmationNumber.toString() === '3') {
      window.location.reload()
    }
  })
  .on('error',(error) => {
    console.error(error)
    window.alert(`There was an error!`)
    window.location.reload()
  })
}

export const depositToken = (dispatch, exchange, web3, token, amount, account) => {
  amount = web3.utils.toWei(amount, 'ether')

  token.methods.approve(exchange.options.address, amount).send({ from: account })
  .on('transactionHash', (hash) => {
    exchange.methods.depositToken(token.options.address, amount).send({ from: account })
    .on('transactionHash', (hash) => {
      dispatch(balancesLoading())
    })
    .on('confirmation', (confirmationNumber, receipt) => {
    if(confirmationNumber.toString() === '3') {
      window.location.reload()
    }
  })
    .on('error',(error) => {
      console.error(error)
      window.alert(`There was an error!`)
      window.location.reload()
    })
  })
}

export const withdrawToken = (dispatch, exchange, web3, token, amount, account) => {
  exchange.methods.withdrawToken(token.options.address, web3.utils.toWei(amount, 'ether')).send({ from: account })
  .on('transactionHash', (hash) => {
    dispatch(balancesLoading())
  })
  .on('confirmation', (confirmationNumber, receipt) => {
    if(confirmationNumber.toString() === '3') {
      window.location.reload()
    }
  })
  .on('error',(error) => {
    console.error(error)
    window.alert(`There was an error!`)
    window.location.reload()
  })
}

export const makeBuyOrder = (dispatch, exchange, token, web3, order, account) => {
  const tokenGet = token.options.address
  const amountGet = web3.utils.toWei(order.amount, 'ether')
  const tokenGive = ETHER_ADDRESS
  const amountGive = web3.utils.toWei((order.amount * order.price).toString(), 'ether')

  exchange.methods.makeOrder(tokenGet, amountGet, tokenGive, amountGive).send({ from: account })
  .on('transactionHash', (hash) => {
    dispatch(buyOrderMaking())
  })
  .on('confirmation', (confirmationNumber, receipt) => {
    if(confirmationNumber.toString() === '3') {
      window.location.reload()
    }
  })
  .on('error',(error) => {
    console.error(error)
    window.alert(`There was an error!`)
    window.location.reload()
  })
}

export const makeSellOrder = (dispatch, exchange, token, web3, order, account) => {
  const tokenGet = ETHER_ADDRESS
  const amountGet = web3.utils.toWei((order.amount * order.price).toString(), 'ether')
  const tokenGive = token.options.address
  const amountGive = web3.utils.toWei(order.amount, 'ether')

  exchange.methods.makeOrder(tokenGet, amountGet, tokenGive, amountGive).send({ from: account })
  .on('transactionHash', (hash) => {
    dispatch(sellOrderMaking())
  })
  .on('confirmation', (confirmationNumber, receipt) => {
    if(confirmationNumber.toString() === '3') {
      window.location.reload()
    }
  })
  .on('error',(error) => {
    console.error(error)
    window.alert(`There was an error!`)
    window.location.reload()
  })
}
