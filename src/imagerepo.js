CM = window.CM || {};

CM.ImageRepo = class Repo{

		constructor() {
				this.loadedRegister =[];
					this.register("img/player.png", "player");
					this.register("img/blimp.png", "blimp");
					this.register("img/cloud.png", "cloud");
					this.register("img/tile_water.png", "tile_water");
					this.register("img/tile_land_desert.png", "tile_land_desert");
					
					
				// //	this.register("img/player_right.png", "playerRight");
				// 	this.register("img/coinBronze.png", "bronzecoin");
				// 	this.register("img/coinSilver.png", "silvercoin");
				// 	this.register("img/coinGold.png", "goldcoin");
				// 	this.register("img/star.png", "star");
				// 	this.register("img/grassTop.png", "grassTop");
				// 	this.register("img/grassCenter.png", "grassCenter");
				// 	this.register("img/grassEnd.png", "grassEnd");
				// 	this.register("img/left_arrow.png", "hudleft");
				// 	this.register("img/right_arrow.png", "hudright");
				// 	this.register("img/restart.png","restart");
				// 	this.registerAnimation("img/player_right",4,"png","playerRight");
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
						
						for(var i = 0; i < count; i++)
						{
							var image = new Image();
							image.src = pathbase+i+"."+type;
							this[attrname].push(image);
						}
					
					}
		getImage(name) {
						return this[name];
		}
		

}