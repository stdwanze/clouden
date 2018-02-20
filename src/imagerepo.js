CM = window.CM || {};

CM.ImageRepo = class Repo{

		constructor() {
				this.loadedRegister =[];
		//			this.register("img/player.png", "player");
					this.register("img/blimp.png", "blimp");
					this.register("img/cloud.png", "cloud");
					this.register("img/tile_water32.png", "tile_water");
					this.register("img/tile_land_desert32.png", "tile_land_desert");
					this.register("img/water_border_top.png", "border_land_water_top");
					this.register("img/water_border_down.png", "border_land_water_down");
					this.register("img/water_border_left.png", "border_land_water_left");
					this.register("img/water_border_right.png", "border_land_water_right");
			
					this.register("img/vegetation-1.png", "decal_land_vegetation_1");
					this.register("img/vegetation-2.png", "decal_land_vegetation_2");
					this.register("img/coin-10.png", "coin_10");
					this.register("img/health-10.png", "health_10");
					this.register("img/ammo-10.png", "ammo_10");

					this.register("img/fireball_small.png", "fireball_small");

					this.register("img/ammo-osd.png", "ammo-osd");
					this.register("img/health-osd.png", "health-osd");
					this.register("img/coins-osd.png", "coins-osd");
				
					
			
				  this.registerAnimation("img/player",4,"png","playerAni");
				  this.registerAnimation("img/playerleft",4,"png","playerAniLeft");
				// 	this.registerAnimation("img/player_left",4,"png","playerLeft");
		}
		load() {
			var loadRegister = this.loadedRegister;
			var p = new Promise(
				function (resolve, reject)
				{
					var i = 0;
					function check(resolve, reject)
					{
						i++;
						var notFinished = false;
						for(var k in  loadRegister)
						{
							if(loadRegister.hasOwnProperty(k))
							{
								if(loadRegister[k] != true)
								{
									notFinished = true;
									break;
								}
							}
						}
						
						if(notFinished ){
							if(i == 11)
							{
								reject();
							}
							setTimeout( function () {check(resolve,reject);}, 1000);

						} 
						else {
							resolve();
						}
					}
					check(resolve,reject);

					
				}
			);
			return p;


		}


				
        register (path, attrname) {
						this[attrname] = new Image();
						this.loadedRegister[attrname] = false;
                        this[attrname].onload = (function (a,p,loadedRegister)
                        {
                            return function (){
							   console.log("load img "+a + " from path "+p);
							   loadedRegister[a] = true;
                            };
                           
                        }(attrname,path,this.loadedRegister ));
						this[attrname].src = path;
		}
		registerAnimation(pathbase,count,type, attrname) {
						this[attrname] = [];
						
						for(var i = 1; i <= count; i++)
						{
							var image = new Image();
							image.src = pathbase+i+"."+type;
							this[attrname].push(image);

							this[attrname][i-1].onload = (function (a,p,loadedRegister, holder, k)
							{
								return function (){
								   console.log("load img "+a + " from path "+p);
								   loadedRegister[a] = true;
								   holder.width = holder[k].width;
								   holder.height = holder[k].height;
								};
							   
							}(attrname+i,image.src,this.loadedRegister, this[attrname] ,i-1));
						}
					
					}
		getImage(name) {
						return this[name];
		}
		

}