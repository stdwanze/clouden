CM = window.CM || {}

CM.Dragon = class Dragon extends CM.VehicleSprite
{
    constructor(location, image)
    {
        super(location,image,CM.SkyLevel+1,0.5);
        this.spit = null;
        this.scores = new CM.ScoreSet();
        this.scores.add(new CM.Health(20));
        this.speed = 0.1;
        this.cooldown = 0;
        this.hitmanager = new CM.Hitable();
    }
    
    setFireBallCreator(fireballmaker)
    {
        this.spit = fireballmaker;
    }
    hit(strength)
    {
        this.hitmanager.hit();
        var healthBar = this.scores.get("HEALTH");
        healthBar.reduce(strength);
       
        if(healthBar.getScore() == healthBar.getMin() && this.remove)
        {
            this.remove(this);
        }
    }
    tick(player)
    {
        if(player != null){
     
            if(CM.distance(this.position,player.position) < 150)
            {
     
                var movement = CM.getVector(this.position, player.position, 1);

                super.move(movement.x*this.speed,movement.y*this.speed);
                
                if(this.spit && this.cooldown == 0)
                {
                    this.cooldown = 120;
                    this.spit(this.position,this.z, "DRAGONFIRE",new CM.Point(movement.x*3,movement.y*3), this.id);
                }
                else
                {

                    this.cooldown--;
                }
            }
        }
    }
    draw(renderer)
    {
        super.draw(renderer);
        this.hitmanager.draw(this, renderer);
      
    }
}