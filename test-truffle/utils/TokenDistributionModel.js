class TokenDistributionModel {
    balances = {}; //user - balance
    users = {}; // user - amount,dollarTime
    dist = [];
    state = {amount:0, to : 0, dollarTime:0}

    
    constructor()
    {
        this.distribute(0, 0); // init
    }
   
    deposit(user, amount, t){
       
        if (!this.users[user])
        {
            this.users[user] = { amount : amount, dollarTime : amount*t, depositNum : this.dist.length, startNum : this.dist.length  }
        }
        else {
            this.claim(user);
            if(this.dist.length == this.users[user].depositNum) {
                this.users[user].amount += amount;
                this.users[user].dollarTime += t*amount;
            }
            else {
                this.users[user].dollarTime = this.dist[this.dist.length-1].t * this.users[user].amount + t * amount;
                this.users[user].amount += amount;
                this.users[user].depositNum = this.dist.length;
            }
        }
        this.state.amount += amount;
        this.state.dollarTime += amount * t;
    
    }
    
    distribute(amount, t){
        
        let tdt = amount / (t * this.state.amount - this.state.dollarTime);
    
        this.dist.push({tdt:tdt, amount:amount, t:t});
        this.state.dollarTime = this.state.amount*t;
    }
    
    getEarn(user){
        if (this.users[user].depositNum == this.dist.length)
            return 0;
    
        let result = 0;
        for(let i = this.users[user].startNum; i < this.dist.length; ++i){
            if (this.users[user].depositNum == i){
                result += this.dist[i].tdt * (this.users[user].amount * this.dist[i].t - this.users[user].dollarTime)
            }else{
                result += this.dist[i].tdt * (this.users[user].amount * (this.dist[i].t - this.dist[i-1].t))
            }
        }
        return result;
    }
    
    claim(user){
        let earn = this.getEarn(user);
        if (this.balances[user])
            this.balances[user] += earn
        else
            this.balances[user] = earn
    
        this.users[user].startNum = this.dist.length;
    }
    
    getBalance(user){
        return this.balances[user] ? this.balances[user] : 0;
    }
    
}
module.exports= TokenDistributionModel;