interface User {
	amount: number;
	dollarTime: number;
	depositNum: number;
	startNum: number;
}

interface Dist {
	tdt: number;
	amount: number;
	t: number;
}

type Users = {[user: string]: User};

export class TokenDistributionModel {
	private balances: {[user: string]: number} = {}; //user - balance
	private users: Users = {}; // user - amount,dollarTime
	private dist: Dist[] = [];
	private state = {amount: 0, to: 0, dollarTime: 0};

	constructor() {
		this.distribute(0, 0); // init
	}

	public deposit(user: string, amount: number, t: number) {
		if (!this.users[user]) {
			this.users[user] = {
				amount: amount,
				dollarTime: amount * t,
				depositNum: this.dist.length,
				startNum: this.dist.length,
			};
		} else {
			this.claim(user);
			if (this.dist.length == this.users[user].depositNum) {
				this.users[user].amount += amount;
				this.users[user].dollarTime += t * amount;
			} else {
				this.users[user].dollarTime =
					this.dist[this.dist.length - 1].t * this.users[user].amount +
					t * amount;
				this.users[user].amount += amount;
				this.users[user].depositNum = this.dist.length;
			}
		}
		this.state.amount += amount;
		this.state.dollarTime += amount * t;
	}

	public distribute(amount: number, t: number) {
		let tdt = amount / (t * this.state.amount - this.state.dollarTime);

		this.dist.push({tdt: tdt, amount: amount, t: t});
		this.state.dollarTime = this.state.amount * t;
	}

	public getEarn(user: string) {
		if (this.users[user].depositNum == this.dist.length) return 0;

		let result = 0;
		for (let i = this.users[user].startNum; i < this.dist.length; ++i) {
			if (this.users[user].depositNum == i) {
				result +=
					this.dist[i].tdt *
					(this.users[user].amount * this.dist[i].t -
						this.users[user].dollarTime);
			} else {
				result +=
					this.dist[i].tdt *
					(this.users[user].amount * (this.dist[i].t - this.dist[i - 1].t));
			}
		}
		return result;
	}

	public claim(user: string) {
		let earn = this.getEarn(user);
		if (this.balances[user]) this.balances[user] += earn;
		else this.balances[user] = earn;

		this.users[user].startNum = this.dist.length;
	}

	public getBalance(user: string) {
		return this.balances[user] ? this.balances[user] : 0;
	}
}
