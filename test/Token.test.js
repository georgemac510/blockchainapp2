import { tokens, EVM_REVERT } from './helpers'

const Token = artifacts.require('./Token')

require('chai')
	.use(require('chai-as-promised'))
	.should()

contract('Token', ([deployer, receiver, exchange]) => {
	const name = 'McKurz Capital Token'
	const symbol = 'MKC'
	const decimals = '18'
	const totalSupply = tokens(1000000).toString()
	let token

	beforeEach(async () => {
		token = await Token.new()
	})

	describe('deployment', () => {
		it('tracks the name', async () => {
			// Fetch token from blockchain
			/* const token = await Token.new()
			   (Don't need it because of the beforeEach as we would need this multiple times)
			*/
			// Read token name here...
			const result = await token.name()
			// Token name is My Name
			result.should.equal(name)
		})

		it('tracks the symbol', async () => {
			const result = await token.symbol()
			result.should.equal(symbol)
		})

		it('tracks the decimals', async () => {
			const result = await token.decimals()
			result.toString().should.equal(decimals)
		})

		it('tracks the totalSupply', async () => {
			const result = await token.totalSupply()
			result.toString().should.equal(totalSupply.toString())
		})

		it('assigns the total supply to the deployer', async () => {
			const result = await token.balanceOf(deployer)
			result.toString().should.equal(totalSupply.toString())
		})
	})

	describe('sending tokens', () => {
		let result
		let amount

		describe('success', async () => {

			beforeEach(async () => {
				amount = tokens(100)
				// Transfer...
				result = await token.transfer(receiver, amount, { from: deployer })
			})

			it('transfer token balances', async () => {
				let balanceOf

				balanceOf = await token.balanceOf(deployer)
				balanceOf.toString().should.equal(tokens(999900).toString())
				balanceOf = await token.balanceOf(receiver)
				balanceOf.toString().should.equal(tokens(100).toString())
			})

			it('emits a Transfer event', async () => {
				const log = result.logs[0]
				log.event.should.eq('Transfer')
				const event = log.args
				event.from.toString().should.eq(deployer, 'from is correct')
				event.to.should.eq(receiver, 'to is correct')
				event.value.toString().should.eq(amount.toString(), 'value is correct')
			})
		})

		describe('failure', async () => {

			it('rejects insufficient balances', async () => {
				let invalidAmount
				invalidAmount = tokens(100000000) // 100 million - greater than total supply
				await token.transfer(receiver, invalidAmount, {from: deployer}).should.be.rejectedWith(EVM_REVERT)

				// Attemp transfer of tokens when you have none
				invalidAmount = tokens(10) // recipient has no tokens
				await token.transfer(deployer, invalidAmount, { from: receiver }).should.be.rejectedWith(EVM_REVERT)
			})

			it('rejects invalid recipients', async () => {
				await token.transfer(0x0, amount, { from: deployer }).should.be.rejected
			})
		})
	})

	describe('approving tokens', () => {
		let result
		let amount

		beforeEach(async () => {
			amount = tokens(100)
			result = await token.approve(exchange, amount, { from: deployer })
		})

		describe('success', () => {
			it('allocates an allowance for delegated token spending on exchange', async () => {
				const allowance = await token.allowance(deployer, exchange)
				allowance.toString().should.equal(amount.toString())
			})

			it('emits an Approval event', async () => {
				const log = result.logs[0]
				log.event.should.eq('Approval')
				const event = log.args
				event.owner.toString().should.eq(deployer, 'owner is correct')
				event.spender.should.eq(exchange, 'spender is correct')
				event.value.toString().should.eq(amount.toString(), 'value is correct')
			})
		})

		describe('failure', () => {
			it('rejects invalid spenders', async () => {
				await token.approve(0x0, amount, { from: deployer }).should.be.rejected
			})
		})
	})

	describe('delegated token transfers', () => {
		let result
		let amount

		beforeEach(async () => {
			amount = tokens(100)
			await token.approve(exchange, amount, { from: deployer })
		})

		describe('success', async () => {

			beforeEach(async () => {
				// Transfer...
				result = await token.transferFrom(deployer, receiver, amount, { from: exchange })
			})

			it('transfer token balances', async () => {
				let balanceOf

				balanceOf = await token.balanceOf(deployer)
				balanceOf.toString().should.equal(tokens(999900).toString())
				balanceOf = await token.balanceOf(receiver)
				balanceOf.toString().should.equal(tokens(100).toString())
			})

			it('resets the allowance', async () => {
				const allowance = await token.allowance(deployer, exchange)
				allowance.toString().should.equal('0')
			})

			it('emits a Transfer event', async () => {
				const log = result.logs[0]
				log.event.should.eq('Transfer')
				const event = log.args
				event.from.toString().should.eq(deployer, 'from is correct')
				event.to.should.eq(receiver, 'to is correct')
				event.value.toString().should.eq(amount.toString(), 'value is correct')
			})
		})

		describe('failure', async () => {

			it('rejects insufficient amounts', async () => {
				// Attempt transfer of too many tokens
				const invalidAmount = tokens(100000000) // 100 million - greater than total supply
				await token.transferFrom(deployer, receiver, invalidAmount, {from: exchange}).should.be.rejectedWith(EVM_REVERT)
			})

			it('rejects invalid recipients', async () => {
				await token.transferFrom(deployer, 0x0, amount, { from: exchange }).should.be.rejected
			})
		})
	})
})
