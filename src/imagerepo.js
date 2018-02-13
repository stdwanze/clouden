CM = window.CM || {};

CM.ImageRepo = class Repo{

		constructor() {
				this.loadedRegister =[];
		//			this.register("img/player.png", "player");
					this.register("img/blimp.png", "blimp");
					this.register("img/cloud.png", "cloud");
					this.register("img/tile_water32.png", "tile_water");
					this.register("img/tile_land_desert32.png", "tile_land_desert");
					
					
			
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