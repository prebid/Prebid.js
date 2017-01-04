import { expect } from 'chai';
import Adapter from 'src/adapters/pubgears'

describe('PubGearsAdapter', () => {

	var adapter

	beforeEach(() => adapter = new Adapter())
	describe('request function', () => {

		it('has `#callBids()` method', () => {
			expect(adapter.callBids).to.exist.and.to.be.a('function')
		})
	})

})
